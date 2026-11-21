import { lookup } from 'node:dns/promises';
import { ChannelFeedService } from './channel-feed.service.js';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

const resolveTo = (...addresses: string[]) =>
  vi
    .mocked(lookup)
    .mockResolvedValue(addresses.map((address) => ({ address, family: 4 })) as never);

describe('ChannelFeedService', () => {
  const feeds = new ChannelFeedService();
  const request = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', request);
    request.mockReset();
    resolveTo('93.184.216.34');
  });
  afterAll(() => vi.unstubAllGlobals());

  it('returns the text of the feed', async () => {
    request.mockResolvedValue(new Response('BEGIN:VCALENDAR\r\nEND:VCALENDAR'));
    await expect(feeds.fetch('https://portal.example/ical/abc.ics')).resolves.toContain(
      'VCALENDAR',
    );
  });

  it('follows a redirect and checks the new address too', async () => {
    request
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: '/moved.ics' } }),
      )
      .mockResolvedValueOnce(new Response('BEGIN:VCALENDAR'));
    await expect(feeds.fetch('https://portal.example/a.ics')).resolves.toBe('BEGIN:VCALENDAR');
    expect(request.mock.calls[1][0]).toBe('https://portal.example/moved.ics');
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('never asks an address inside the server’s own network', async () => {
    resolveTo('93.184.216.34', '10.0.0.5');
    await expect(feeds.fetch('https://intranet.example/a.ics')).rejects.toMatchObject({
      code: 'address',
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('reports a refusal, a silent server and a file that is too large', async () => {
    request.mockResolvedValueOnce(new Response('gone', { status: 404 }));
    await expect(feeds.fetch('https://portal.example/a.ics')).rejects.toMatchObject({
      code: 'http',
    });

    request.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));
    await expect(feeds.fetch('https://portal.example/a.ics')).rejects.toMatchObject({
      code: 'unreachable',
    });

    request.mockResolvedValueOnce(new Response('x'.repeat(1_000_001)));
    await expect(feeds.fetch('https://portal.example/a.ics')).rejects.toMatchObject({
      code: 'too_large',
    });
  });
});
