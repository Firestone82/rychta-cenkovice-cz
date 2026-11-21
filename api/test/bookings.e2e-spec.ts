import { day, TestApp } from './support/test-app.js';

describe('Bookings', () => {
  let t: TestApp;
  let first: number;
  let second: number;

  beforeAll(async () => {
    t = await TestApp.create();
    [first, second] = await t.apartmentIds();
  });
  afterAll(() => t.close());

  const request = (overrides: Record<string, unknown> = {}) => ({
    apartment_ids: [first],
    check_in: day(10),
    check_out: day(13),
    guests: 3,
    name: 'Jan Test',
    email: 'jan@example.com',
    phone: '+420 600 000 000',
    consent: true,
    language: 'cs',
    ...overrides,
  });

  it('seeds the six apartments', async () => {
    expect(await t.apartmentIds()).toHaveLength(6);
  });

  it('holds the dates of a request and e-mails the owner and the guest', async () => {
    const res = await t.call('post', '/bookings').send(request()).expect(201);
    expect(res.body).toMatchObject({
      status: 'pending',
      check_in: day(10),
      nights: 3,
      total_price: null,
    });
    expect(res.body.code).toMatch(/^RC-[A-Z2-9]{6}$/);

    const mails = await t.mails();
    expect(mails).toHaveLength(2);
    expect(mails.join('\n')).toContain(`Nová poptávka ${res.body.code}`);
    expect(mails.join('\n')).toContain(`Přijali jsme vaši poptávku ${res.body.code}`);
  });

  it('refuses the same apartment for overlapping dates', async () => {
    const res = await t
      .call('post', '/bookings')
      .send(request({ check_in: day(12), check_out: day(15) }))
      .expect(409);
    expect(res.body).toMatchObject({ error: { code: 'unavailable' }, apartment_ids: [first] });
  });

  it('lets a guest arrive on the previous guest’s departure day', async () => {
    await t
      .call('post', '/bookings')
      .send(request({ check_in: day(13), check_out: day(15) }))
      .expect(201);
  });

  it('lets only one of two simultaneous requests through', async () => {
    const stay = { apartment_ids: [second], check_in: day(60), check_out: day(63) };
    const results = await Promise.all(
      [1, 2, 3].map(() => t.call('post', '/bookings').send(request(stay))),
    );
    expect(results.map((res) => res.status).sort((a, b) => a - b)).toEqual([201, 409, 409]);
    const list = await t.call('get', `/availability?from=${day(60)}&to=${day(63)}`).expect(200);
    expect(list.body.ranges).toHaveLength(1);
  });

  it('names every field of the form that is wrong', async () => {
    const res = await t
      .call('post', '/bookings')
      .send({ apartment_ids: [second], name: 'X', email: 'nope', phone: '1', consent: false })
      .expect(422);
    expect(res.body.error).toMatchObject({
      code: 'validation',
      fields: { name: 'required', email: 'invalid', phone: 'invalid', consent: 'required' },
    });
  });

  it('checks the stay against the calendar and the beds', async () => {
    t.newVisitor();
    const past = await t
      .call('post', '/bookings')
      .send(request({ apartment_ids: [second], check_in: day(-1), check_out: day(2), guests: 40 }))
      .expect(422);
    expect(past.body.error.fields).toEqual({ check_in: 'in_past', guests: 'over_capacity' });

    const backwards = await t
      .call('post', '/bookings')
      .send(request({ check_in: day(5), check_out: day(5) }))
      .expect(422);
    expect(backwards.body.error.fields).toEqual({ check_out: 'before_check_in' });

    const unknown = await t
      .call('post', '/bookings')
      .send(request({ apartment_ids: [9999] }))
      .expect(422);
    expect(unknown.body.error.fields).toEqual({ apartment_ids: 'unknown' });
  });

  it('answers a bot that filled in the hidden field as if it worked, storing nothing', async () => {
    const before = await t.call('get', `/availability?from=${day(0)}&to=${day(30)}`);
    const res = await t
      .call('post', '/bookings')
      .send({ website: 'http://spam.example' })
      .expect(201);
    expect(res.body).toMatchObject({ status: 'pending' });
    const after = await t.call('get', `/availability?from=${day(0)}&to=${day(30)}`);
    expect(after.body.ranges).toEqual(before.body.ranges);
  });

  it('shows the held dates publicly without guest data', async () => {
    const res = await t.call('get', `/availability?from=${day(0)}&to=${day(30)}`).expect(200);
    expect(res.body.ranges).toEqual([
      { apartment_id: first, from: day(10), to: day(13), status: 'pending' },
      { apartment_id: first, from: day(13), to: day(15), status: 'pending' },
    ]);

    const check = await t
      .call('get', `/availability/check?check_in=${day(11)}&check_out=${day(12)}`)
      .expect(200);
    expect(check.body).toMatchObject({ nights: 1, unavailable_ids: [first] });

    await t.call('get', '/availability?from=nonsense&to=2030-01-01').expect(422);
  });

  it('keeps the administration behind a token', async () => {
    const res = await t.call('get', '/admin/bookings').expect(401);
    expect(res.body.error.code).toBe('unauthorized');
    expect(res.get('WWW-Authenticate')).toContain('Bearer');
  });

  describe('in the administration', () => {
    let pending: { id: number; code: string }[];
    let manual: { id: number };

    beforeAll(async () => {
      await t.login();
      const res = await t.call('get', '/admin/bookings?status=pending').expect(200);
      pending = (res.body.items as typeof pending).filter((_, index) => index < 2);
    });

    it('lists the requests by arrival', async () => {
      expect(pending).toHaveLength(2);
      const found = await t
        .call('get', `/admin/bookings?q=${pending[0].code.toLowerCase()}`)
        .expect(200);
      expect(found.body.items).toHaveLength(1);
      expect(found.body.items[0]).toMatchObject({
        name: 'Jan Test',
        apartment_ids: [first],
        nights: 3,
      });
    });

    it('confirms a request and tells the guest, with the owner’s own words', async () => {
      const mailsBefore = (await t.mails()).length;
      const res = await t
        .call('patch', `/admin/bookings/${pending[0].id}`)
        .send({ status: 'confirmed', notify: true, guest_message: 'Těšíme se na vás.' })
        .expect(200);
      expect(res.body.status).toBe('confirmed');

      const mails = await t.mails();
      expect(mails).toHaveLength(mailsBefore + 1);
      const confirmation = mails.find((mail) => mail.includes('je potvrzena'));
      expect(confirmation).toContain('Zpráva od nás:\nTěšíme se na vás.');
    });

    it('frees the dates of a cancelled request', async () => {
      await t
        .call('patch', `/admin/bookings/${pending[1].id}`)
        .send({ status: 'cancelled' })
        .expect(200);
      const check = await t.call(
        'get',
        `/availability/check?check_in=${day(13)}&check_out=${day(15)}`,
      );
      expect(check.body.unavailable_ids).toEqual([]);
    });

    it('takes a booking by hand over several apartments', async () => {
      const res = await t
        .call('post', '/admin/bookings')
        .send({
          apartment_ids: [first, second],
          check_in: day(13),
          check_out: day(16),
          guests: 8,
          name: 'Skupina Novák',
          phone: '+420 777 111 222',
        })
        .expect(201);
      expect(res.body).toMatchObject({
        status: 'confirmed',
        source: 'admin',
        apartment_ids: [first, second],
      });
      manual = res.body as typeof manual;
    });

    it('refuses to move it onto a confirmed stay', async () => {
      const res = await t
        .call('patch', `/admin/bookings/${manual.id}`)
        .send({ check_in: day(11) })
        .expect(409);
      expect(res.body.apartment_ids).toEqual([first]);
    });

    it('prices a stay from the nightly prices unless a price is given', async () => {
      await t
        .call('patch', `/admin/apartments/${first}`)
        .send({ price_per_night: 1500 })
        .expect(200);
      await t
        .call('patch', `/admin/apartments/${second}`)
        .send({ price_per_night: 2000 })
        .expect(200);
      const auto = await t
        .call('patch', `/admin/bookings/${manual.id}`)
        .send({ auto_price: true })
        .expect(200);
      expect(auto.body.total_price).toBe(3 * (1500 + 2000));
      const fixed = await t
        .call('patch', `/admin/bookings/${manual.id}`)
        .send({ total_price: 9000 })
        .expect(200);
      expect(fixed.body.total_price).toBe(9000);
      const cleared = await t
        .call('patch', `/admin/bookings/${manual.id}`)
        .send({ clear_price: true })
        .expect(200);
      expect(cleared.body.total_price).toBeNull();
    });

    it('blocks dates without a guest', async () => {
      const res = await t
        .call('post', '/admin/bookings')
        .send({
          kind: 'block',
          apartment_ids: [second],
          check_in: day(20),
          check_out: day(22),
          name: 'Malování',
        })
        .expect(201);
      expect(res.body).toMatchObject({ kind: 'block', status: 'confirmed', guests: 0 });
    });

    it('rejects a guest booking without a name or with an unknown status', async () => {
      const res = await t
        .call('post', '/admin/bookings')
        .send({ apartment_ids: [second], check_in: day(30), check_out: day(32), status: 'maybe' })
        .expect(422);
      expect(res.body.error.fields).toEqual({ status: 'invalid', name: 'required' });
    });

    it('summarises the coming days on the dashboard', async () => {
      const res = await t.call('get', '/admin/dashboard').expect(200);
      expect(res.body.today).toBe(day(0));
      expect(res.body.dashboard).toMatchObject({
        pending_bookings: 1,
        new_messages: 0,
        apartments: 6,
      });
      expect(res.body.dashboard.arrivals.map((b: { name: string }) => b.name)).toEqual([
        'Jan Test',
        'Skupina Novák',
      ]);
    });

    it('answers 404 for a booking that does not exist', async () => {
      await t.call('get', '/admin/bookings/999999').expect(404);
      await t.call('get', '/admin/bookings/abc').expect(404);
      await t.call('delete', `/admin/bookings/${manual.id}`).expect(204);
      await t.call('get', `/admin/bookings/${manual.id}`).expect(404);
    });
  });
});
