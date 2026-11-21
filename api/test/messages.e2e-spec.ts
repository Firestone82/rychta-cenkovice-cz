import { day, TestApp } from './support/test-app.js';

interface Message {
  id: number;
  name: string;
  status: string;
  booking_id: number | null;
}

describe('Contact form and messages', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await TestApp.create();
  });
  afterAll(() => t.close());

  const message = (overrides: Record<string, unknown> = {}) => ({
    name: 'Eva Nováková',
    email: 'Eva@Example.com',
    phone: '',
    message: 'Dobrý den, máte volno o jarních prázdninách?',
    consent: true,
    language: 'cs',
    ...overrides,
  });
  const fields = (res: { body: unknown }) =>
    (res.body as { error: { code: string; fields: Record<string, string> } }).error.fields;
  const messages = async (status = ''): Promise<Message[]> => {
    const res = await t.call('get', `/admin/messages${status && `?status=${status}`}`).expect(200);
    return (res.body as { items: Message[] }).items;
  };

  it('stores a message and e-mails the owner, who can answer the sender directly', async () => {
    await t.call('post', '/contact').send(message()).expect(204);
    const [mail] = await t.mails();
    expect(mail).toContain('Subject: Zpráva z webu: Eva Nováková');
    expect(mail).toContain('Reply-To: Eva@Example.com');
    expect(mail).toContain('máte volno o jarních prázdninách');
  });

  it('names every field that is wrong and stores nothing', async () => {
    const res = await t
      .call('post', '/contact')
      .send(
        message({
          name: ' ',
          email: 'not-an-address',
          phone: 'abc',
          message: 'Hi',
          consent: false,
        }),
      )
      .expect(422);
    expect(fields(res)).toEqual({
      name: 'required',
      email: 'invalid',
      phone: 'invalid',
      message: 'required',
      consent: 'required',
    });
    expect(fields(await t.call('post', '/contact').send({}).expect(422))).toMatchObject({
      name: 'required',
      email: 'invalid',
      message: 'required',
      consent: 'required',
    });
    expect(await t.mails()).toHaveLength(1);
  });

  it('pretends to accept a bot that filled in the hidden field', async () => {
    await t
      .call('post', '/contact')
      .send(message({ name: 'Bot', website: 'https://spam.example' }))
      .expect(204);
    expect(await t.mails()).toHaveLength(1);
  });

  describe('in the administration', () => {
    let id: number;

    beforeAll(async () => {
      await t
        .call('post', '/contact')
        .send(message({ name: 'Second Sender', language: 'en' }))
        .expect(204);
      await t.login();
    });

    it('lists messages newest first, without the bot’s', async () => {
      const items = await messages();
      expect(items.map((item) => item.name)).toEqual(['Second Sender', 'Eva Nováková']);
      expect(items.every((item) => item.status === 'new' && item.booking_id === null)).toBe(true);
      id = items[1].id;
    });

    it('counts new messages on the dashboard', async () => {
      const res = await t.call('get', '/admin/dashboard').expect(200);
      expect(res.body).toMatchObject({ dashboard: { new_messages: 2 } });
    });

    it('turns a message into a booking and marks it as read', async () => {
      const [apartment] = await t.apartmentIds();
      const booking = await t
        .call('post', '/admin/bookings')
        .send({
          apartment_ids: [apartment],
          check_in: day(20),
          check_out: day(23),
          guests: 2,
          name: 'Eva Nováková',
          email: 'eva@example.com',
          message_id: id,
        })
        .expect(201);
      const linked = (await messages()).find((item) => item.id === id);
      expect(linked).toMatchObject({
        status: 'read',
        booking_id: (booking.body as { id: number }).id,
      });

      const unknown = await t
        .call('post', '/admin/bookings')
        .send({
          apartment_ids: [apartment],
          check_in: day(30),
          check_out: day(32),
          name: 'X',
          message_id: 9999,
        })
        .expect(422);
      expect(fields(unknown)).toEqual({ message_id: 'unknown' });
    });

    it('archives a message out of the default list', async () => {
      const res = await t
        .call('patch', `/admin/messages/${id}`)
        .send({ status: 'archived' })
        .expect(200);
      expect(res.body).toMatchObject({ id, status: 'archived' });
      expect((await messages()).map((item) => item.id)).not.toContain(id);
      expect((await messages('archived')).map((item) => item.id)).toEqual([id]);
      expect(await messages('all')).toHaveLength(2);

      const invalid = await t
        .call('patch', `/admin/messages/${id}`)
        .send({ status: 'lost' })
        .expect(422);
      expect(fields(invalid)).toEqual({ status: 'invalid' });
      await t.call('patch', '/admin/messages/9999').send({ status: 'read' }).expect(404);
    });

    it('deletes a message but keeps the booking made from it', async () => {
      await t.call('delete', `/admin/messages/${id}`).expect(204);
      expect(await messages('all')).toHaveLength(1);
      const bookings = await t.call('get', '/admin/bookings').expect(200);
      expect(
        (bookings.body as { items: { message_id: number | null }[] }).items[0].message_id,
      ).toBeNull();
    });
  });
});
