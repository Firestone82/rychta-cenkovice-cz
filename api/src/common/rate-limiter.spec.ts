import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('blocks a key after the allowed hits until its window ends', () => {
    const limiter = new RateLimiter(2, 60_000);
    limiter.hit('a');
    expect(limiter.retryAfter('a')).toBe(0);
    limiter.hit('a');
    vi.advanceTimersByTime(10_000);
    expect(limiter.retryAfter('a')).toBe(51);
    expect(limiter.retryAfter('b')).toBe(0);

    vi.advanceTimersByTime(50_001);
    expect(limiter.retryAfter('a')).toBe(0);
    limiter.hit('a');
    expect(limiter.retryAfter('a')).toBe(0);
  });

  it('forgets a key on request', () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.hit('a');
    limiter.clear('a');
    expect(limiter.retryAfter('a')).toBe(0);
  });
});
