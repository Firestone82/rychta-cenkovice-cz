import { JwtService } from '@nestjs/jwt';
import { ADMIN, refreshCookie, TestApp } from './support/test-app.js';

interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: { id: number; email: string; name: string; role: string };
}

describe('Authentication', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await TestApp.create();
  });
  afterAll(() => t.close());

  const errorCode = (res: { body: unknown }) =>
    (res.body as { error: { code: string } }).error.code;

  it('signs the administrator in with a short-lived token and an HttpOnly refresh cookie', async () => {
    const res = await t.call('post', '/auth/login').send(ADMIN).expect(200);
    const session = res.body as Session;
    expect(session).toMatchObject({ token_type: 'Bearer', expires_in: 600 });
    expect(session.user).toMatchObject({ email: ADMIN.email, role: 'admin' });
    expect(session.access_token.split('.')).toHaveLength(3);

    const cookie = (res.get('Set-Cookie') ?? []).find((value) => value.startsWith('rc_refresh='));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');

    t.useToken(session.access_token);
    const me = await t.call('get', '/auth/me').expect(200);
    expect(me.body).toEqual(session.user);
  });

  it('stores only a hash of the refresh token', async () => {
    const res = await t.call('post', '/auth/login').send(ADMIN).expect(200);
    const rows = await t.sql<{ token_hash: string }>('SELECT token_hash FROM refresh_tokens');
    expect(rows.map((row) => row.token_hash)).not.toContain(refreshCookie(res));
    expect(rows.every((row) => /^[0-9a-f]{64}$/.test(row.token_hash))).toBe(true);
  });

  it('answers a wrong password and an unknown account the same way', async () => {
    t.newVisitor();
    const wrong = await t
      .stranger('post', '/auth/login')
      .send({ ...ADMIN, password: 'nope' })
      .expect(401);
    const unknown = await t
      .stranger('post', '/auth/login')
      .send({ email: 'nobody@example.com', password: 'nope' })
      .expect(401);
    const malformed = await t.stranger('post', '/auth/login').send({ email: 5 }).expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(errorCode(malformed)).toBe('invalid_credentials');
    expect(wrong.get('Set-Cookie')).toBeUndefined();
  });

  it('needs the header only the website sends, and an allowed origin', async () => {
    const res = await t.agent.post('/api/v1/auth/login').send(ADMIN).expect(403);
    expect(errorCode(res)).toBe('forbidden');
    await t
      .call('post', '/auth/login')
      .set('Origin', 'https://evil.example')
      .send(ADMIN)
      .expect(403);
    await t
      .call('post', '/auth/login')
      .set('Origin', 'http://localhost:4200')
      .send(ADMIN)
      .expect(200);
  });

  it('rotates the refresh token on every use', async () => {
    const login = await t.call('post', '/auth/login').send(ADMIN).expect(200);
    const refreshed = await t.call('post', '/auth/refresh').expect(200);
    expect(refreshCookie(refreshed)).not.toBe(refreshCookie(login));
    expect((refreshed.body as Session).access_token).not.toBe((login.body as Session).access_token);
    await t.call('post', '/auth/refresh').expect(200);
  });

  it('treats two tabs refreshing at once as a race, keeping the session', async () => {
    const login = await t.call('post', '/auth/login').send(ADMIN).expect(200);
    const old = `rc_refresh=${refreshCookie(login)}`;
    await t.call('post', '/auth/refresh').expect(200);

    const late = await t.stranger('post', '/auth/refresh').set('Cookie', old).expect(409);
    expect(errorCode(late)).toBe('refresh_race');
    expect(late.get('Set-Cookie')).toBeUndefined();
    await t.call('post', '/auth/refresh').expect(200);
  });

  it('ends the whole session when a used refresh token comes back later', async () => {
    const login = await t.call('post', '/auth/login').send(ADMIN).expect(200);
    const old = `rc_refresh=${refreshCookie(login)}`;
    await t.call('post', '/auth/refresh').expect(200);
    await t.sql(
      "UPDATE refresh_tokens SET used_at = used_at - interval '1 minute' WHERE used_at IS NOT NULL",
    );

    const stolen = await t.stranger('post', '/auth/refresh').set('Cookie', old).expect(401);
    expect(errorCode(stolen)).toBe('session_revoked');
    const owner = await t.call('post', '/auth/refresh').expect(401);
    expect(errorCode(owner)).toBe('session_expired');
    expect(refreshCookie(owner)).toBe('');
  });

  it('refuses a refresh token past its expiry and one that was never issued', async () => {
    await t.call('post', '/auth/login').send(ADMIN).expect(200);
    await t.sql(
      "UPDATE refresh_tokens SET expires_at = now() - interval '1 second' WHERE used_at IS NULL",
    );
    expect(errorCode(await t.call('post', '/auth/refresh').expect(401))).toBe('session_expired');

    const forged = await t
      .stranger('post', '/auth/refresh')
      .set('Cookie', 'rc_refresh=forged')
      .expect(401);
    expect(errorCode(forged)).toBe('session_expired');
    expect(errorCode(await t.stranger('post', '/auth/refresh').expect(401))).toBe('no_session');
  });

  it('refuses expired, tampered and foreign access tokens', async () => {
    const jwt = t.app.get(JwtService);
    const claims = { role: 'admin', name: 'Admin' };
    const expired = await jwt.signAsync(claims, { subject: '1', expiresIn: -5 });
    const foreign = await jwt.signAsync(claims, { subject: '1', secret: 'x'.repeat(40) });
    const otherAudience = await jwt.signAsync(claims, { subject: '1', audience: 'someone-else' });
    const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(
      JSON.stringify({ ...claims, sub: '1', aud: 'rychta-admin', iss: 'rychtacenkovice.cz' }),
    ).toString('base64url')}.`;

    for (const token of [expired, foreign, otherAudience, unsigned, 'garbage']) {
      t.useToken(token);
      const res = await t.call('get', '/admin/bookings').expect(401);
      expect(errorCode(res)).toBe('token_expired');
      expect(res.get('WWW-Authenticate')).toContain('invalid_token');
    }
    t.useToken('');
    expect(errorCode(await t.call('get', '/admin/bookings').expect(401))).toBe('unauthorized');
  });

  it('lets only administrators into the administration', async () => {
    t.useToken(
      await t.app.get(JwtService).signAsync({ role: 'guest', name: 'Guest' }, { subject: '1' }),
    );
    expect(errorCode(await t.call('get', '/admin/bookings').expect(403))).toBe('forbidden');
  });

  it('signs out by ending the session and clearing the cookie', async () => {
    await t.login();
    const out = await t.call('post', '/auth/logout').expect(204);
    expect(out.get('Set-Cookie')?.[0]).toMatch(/^rc_refresh=;/);
    expect(errorCode(await t.call('post', '/auth/refresh').expect(401))).toBe('no_session');
    await t.call('post', '/auth/logout').expect(204);
  });

  it('changes the password, ending every other session', async () => {
    const elsewhere = await t.stranger('post', '/auth/login').send(ADMIN).expect(200);
    await t.login();
    const next = 'žluťoučký kůň'.padEnd(12, '!');

    const wrong = await t
      .call('post', '/auth/change-password')
      .send({ current_password: 'nope', new_password: next })
      .expect(422);
    expect((wrong.body as { error: { fields: unknown } }).error.fields).toEqual({
      current_password: 'wrong',
    });
    const short = await t
      .call('post', '/auth/change-password')
      .send({ current_password: ADMIN.password, new_password: 'short' })
      .expect(422);
    expect((short.body as { error: { fields: unknown } }).error.fields).toEqual({
      new_password: 'too_short',
    });

    const changed = await t
      .call('post', '/auth/change-password')
      .send({ current_password: ADMIN.password, new_password: next })
      .expect(200);
    expect(refreshCookie(changed)).not.toBe('');
    await t.call('post', '/auth/refresh').expect(200);

    await t
      .stranger('post', '/auth/refresh')
      .set('Cookie', `rc_refresh=${refreshCookie(elsewhere)}`)
      .expect(401);
    await t.stranger('post', '/auth/login').send(ADMIN).expect(401);
    await t
      .stranger('post', '/auth/login')
      .send({ email: ADMIN.email, password: next })
      .expect(200);
  });

  it('slows down guessing: five failed sign-ins lock the address and the account for a while', async () => {
    t.newVisitor();
    const guess = { email: 'owner@example.com', password: 'guess' };
    for (let attempt = 0; attempt < 5; attempt++) {
      await t.stranger('post', '/auth/login').send(guess).expect(401);
    }
    const locked = await t.stranger('post', '/auth/login').send(guess).expect(429);
    expect(errorCode(locked)).toBe('rate_limited');
    expect(Number(locked.get('Retry-After'))).toBeGreaterThan(0);
    expect((locked.body as { retry_after: number }).retry_after).toBeGreaterThan(0);

    // The account stays locked from another address too.
    t.newVisitor();
    await t.stranger('post', '/auth/login').send(guess).expect(429);
    await t
      .stranger('post', '/auth/login')
      .send({ email: 'else@example.com', password: 'x' })
      .expect(401);
  });
});
