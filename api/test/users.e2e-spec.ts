import { ADMIN, refreshCookie, TestApp } from './support/test-app.js';

interface Account {
  id: number;
  email: string;
  name: string;
  role: string;
}

const STAFF = {
  name: 'Jana Recepční',
  email: 'jana@example.com',
  role: 'staff',
  password: 'staff password 123',
};

describe('User management', () => {
  let t: TestApp;
  let adminToken: string;
  let staff: Account;

  beforeAll(async () => {
    t = await TestApp.create();
    const res = await t.call('post', '/auth/login').send(ADMIN).expect(200);
    adminToken = (res.body as { access_token: string }).access_token;
    t.useToken(adminToken);
  });
  afterAll(() => t.close());

  const fields = (res: { body: unknown }) =>
    (res.body as { error: { fields: Record<string, string> } }).error.fields;
  const errorCode = (res: { body: unknown }) =>
    (res.body as { error: { code: string } }).error.code;

  it('lets the administrator create a staff account', async () => {
    const res = await t.call('post', '/admin/users').send(STAFF).expect(201);
    staff = res.body as Account;
    expect(staff).toMatchObject({ name: STAFF.name, email: STAFF.email, role: 'staff' });
    expect(res.body).not.toHaveProperty('password_hash');

    const list = await t.call('get', '/admin/users').expect(200);
    expect((list.body as { items: Account[] }).items.map((u) => u.email)).toEqual([
      ADMIN.email,
      STAFF.email,
    ]);
  });

  it('refuses a taken e-mail, a short password and an unknown role', async () => {
    const taken = await t
      .call('post', '/admin/users')
      .send({ ...STAFF, email: 'JANA@example.com', password: 'short' })
      .expect(422);
    expect(fields(taken)).toEqual({ email: 'taken', password: 'too_short' });
    const invalid = await t
      .call('post', '/admin/users')
      .send({ name: ' ', email: 'nope', role: 'owner', password: STAFF.password })
      .expect(422);
    expect(fields(invalid)).toEqual({ name: 'required', email: 'invalid', role: 'invalid' });
  });

  it('gives staff bookings and messages, but not apartments, photos or accounts', async () => {
    t.newVisitor();
    const session = await t.stranger('post', '/auth/login').send(STAFF).expect(200);
    const staffToken = (session.body as { access_token: string }).access_token;
    const [apartment] = await t.apartmentIds();

    t.useToken(staffToken);
    await t.call('get', '/admin/bookings').expect(200);
    await t.call('get', '/admin/messages').expect(200);
    await t.call('get', '/admin/apartments').expect(200);
    for (const [method, path] of [
      ['patch', `/admin/apartments/${apartment}`],
      ['get', '/admin/photos'],
      ['get', '/admin/users'],
      ['post', '/admin/users'],
      ['delete', `/admin/users/${staff.id}`],
    ] as const) {
      const res = await t.call(method, path).send({}).expect(403);
      expect(errorCode(res)).toBe('forbidden');
    }
    t.useToken(adminToken);
  });

  it('keeps the administrator from locking themselves out', async () => {
    const me = (await t.call('get', '/auth/me').expect(200)).body as Account;
    const demoted = await t.call('patch', `/admin/users/${me.id}`).send({ role: 'staff' });
    expect(demoted.status).toBe(422);
    expect(fields(demoted)).toEqual({ role: 'own_account' });
    const removed = await t.call('delete', `/admin/users/${me.id}`).expect(409);
    expect(errorCode(removed)).toBe('own_account');
    await t.call('patch', `/admin/users/${me.id}`).send({ name: 'Správce' }).expect(200);
  });

  it('signs an account out when its password is replaced or it is deleted', async () => {
    t.newVisitor();
    const session = await t.stranger('post', '/auth/login').send(STAFF).expect(200);
    const cookie = `rc_refresh=${refreshCookie(session)}`;

    const changed = await t
      .call('patch', `/admin/users/${staff.id}`)
      .send({ name: 'Jana', password: 'another password 456' })
      .expect(200);
    expect(changed.body).toMatchObject({ name: 'Jana', role: 'staff' });
    await t.stranger('post', '/auth/refresh').set('Cookie', cookie).expect(401);
    await t.stranger('post', '/auth/login').send(STAFF).expect(401);
    await t
      .stranger('post', '/auth/login')
      .send({ ...STAFF, password: 'another password 456' })
      .expect(200);

    await t.call('delete', `/admin/users/${staff.id}`).expect(204);
    await t.call('delete', `/admin/users/${staff.id}`).expect(404);
    const list = await t.call('get', '/admin/users').expect(200);
    expect((list.body as { items: Account[] }).items).toHaveLength(1);
  });
});
