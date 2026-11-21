import { ChannelFeedService, FeedFailure } from '../src/channels/channel-feed.service.js';
import { day, TestApp } from './support/test-app.js';

interface Channel {
  id: number;
  apartment_id: number;
  import_url: string;
  synced_at: string | null;
  error: string;
  blocks: number;
}

interface Block {
  id: number;
  kind: string;
  source: string;
  imported: boolean;
  name: string;
  check_in: string;
  check_out: string;
  apartment_ids: number[];
}

const URL = 'https://www.e-chalupy.cz/ical/secret-token.ics';
const stamp = (iso: string) => iso.replaceAll('-', '');
const feed = (...stays: [from: number, to: number][]) =>
  [
    'BEGIN:VCALENDAR',
    ...stays.flatMap(([from, to]) => [
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${stamp(day(from))}`,
      `DTEND;VALUE=DATE:${stamp(day(to))}`,
      'SUMMARY:Jan Novák, +420 600 000 000',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ].join('\r\n');

describe('Portal calendars', () => {
  let t: TestApp;
  let apartment: number;
  let channel: Channel;
  /** What the portal answers; an error code stands for a failure. */
  let portal: string;

  beforeAll(async () => {
    t = await TestApp.create();
    await t.login();
    [apartment] = await t.apartmentIds();
    vi.spyOn(t.app.get(ChannelFeedService), 'fetch').mockImplementation(() =>
      portal.startsWith('BEGIN')
        ? Promise.resolve(portal)
        : Promise.reject(new FeedFailure('http')),
    );
  });
  afterAll(() => t.close());

  const blocks = async (): Promise<Block[]> => {
    const res = await t.call('get', '/admin/bookings?kind=block').expect(200);
    return (res.body as { items: Block[] }).items;
  };
  const dates = async () => (await blocks()).map((block) => [block.check_in, block.check_out]);
  const sync = async (): Promise<Channel> => {
    const res = await t.call('post', `/admin/channels/${channel.id}/sync`).expect(200);
    return res.body as Channel;
  };
  const book = (from: number, to: number) =>
    t.call('post', '/admin/bookings').send({
      name: 'Eva Dvořáková',
      check_in: day(from),
      check_out: day(to),
      apartment_ids: [apartment],
    });

  it('blocks the days of the calendar as soon as its address is saved', async () => {
    portal = feed([10, 14], [20, 23], [-9, -5]);
    const res = await t
      .call('put', '/admin/channels')
      .send({ apartment_id: apartment, import_url: URL })
      .expect(200);
    channel = (res.body as { channel: Channel }).channel;
    expect(channel).toMatchObject({ provider: 'echalupy', import_url: URL, error: '', blocks: 2 });
    expect(channel.synced_at).not.toBeNull();

    const [first] = await blocks();
    expect(first).toMatchObject({
      kind: 'block',
      source: 'echalupy',
      imported: true,
      name: 'e-chalupy.cz',
      check_in: day(10),
      check_out: day(14),
      apartment_ids: [apartment],
    });
    expect(await dates()).toEqual([
      [day(10), day(14)],
      [day(20), day(23)],
    ]);
  });

  it('shows the blocked days as taken on the website', async () => {
    const res = await t
      .stranger('get', `/availability/check?check_in=${day(12)}&check_out=${day(13)}`)
      .expect(200);
    expect((res.body as { unavailable_ids: number[] }).unavailable_ids).toContain(apartment);
  });

  it('follows the calendar: moved stays move, removed stays free their days', async () => {
    portal = feed([11, 14], [30, 32]);
    expect(await sync()).toMatchObject({ error: '', blocks: 2 });
    expect(await dates()).toEqual([
      [day(11), day(14)],
      [day(30), day(32)],
    ]);
  });

  it('keeps the blocks and reports the problem when the calendar cannot be read', async () => {
    portal = 'down';
    expect(await sync()).toMatchObject({ error: 'http', blocks: 2 });
    portal = feed([11, 14], [30, 32]);
    expect(await sync()).toMatchObject({ error: '', blocks: 2 });
  });

  it('lets the owner book blocked days; the block gives way and grows back', async () => {
    const res = await book(12, 14).expect(201);
    const booking = res.body as { id: number };
    await sync();
    expect(await dates()).toEqual([
      [day(11), day(12)],
      [day(30), day(32)],
    ]);

    await t.call('delete', `/admin/bookings/${booking.id}`).expect(204);
    await sync();
    expect(await dates()).toEqual([
      [day(11), day(14)],
      [day(30), day(32)],
    ]);
  });

  it('does not let anybody change an imported block', async () => {
    const [block] = await blocks();
    const patched = await t
      .call('patch', `/admin/bookings/${block.id}`)
      .send({ check_out: day(18) })
      .expect(409);
    expect((patched.body as { error: { code: string } }).error.code).toBe('imported');
    await t.call('delete', `/admin/bookings/${block.id}`).expect(409);
  });

  it('validates the address and the apartment', async () => {
    const invalid = await t
      .call('put', '/admin/channels')
      .send({ apartment_id: 9999, import_url: URL })
      .expect(422);
    expect((invalid.body as { error: { fields: unknown } }).error.fields).toEqual({
      apartment_id: 'unknown',
    });
    const scheme = await t
      .call('put', '/admin/channels')
      .send({ apartment_id: apartment, import_url: 'file:///etc/passwd' })
      .expect(422);
    expect((scheme.body as { error: { fields: unknown } }).error.fields).toEqual({
      import_url: 'invalid',
    });
  });

  it('is closed to staff', async () => {
    await t.call('post', '/admin/users').send({
      name: 'Jana',
      email: 'jana@example.com',
      role: 'staff',
      password: 'staff password 123',
    });
    const login = await t
      .stranger('post', '/auth/login')
      .send({ email: 'jana@example.com', password: 'staff password 123' })
      .expect(200);
    const token = (login.body as { access_token: string }).access_token;
    await t.stranger('get', '/admin/channels').set('Authorization', `Bearer ${token}`).expect(403);
  });

  it('removes the upcoming blocks when the calendar is disconnected', async () => {
    const res = await t
      .call('put', '/admin/channels')
      .send({ apartment_id: apartment, import_url: '' })
      .expect(200);
    expect(res.body).toEqual({ channel: null });
    expect(await blocks()).toEqual([]);
    const list = await t.call('get', '/admin/channels').expect(200);
    expect(list.body).toEqual({ items: [] });
  });
});
