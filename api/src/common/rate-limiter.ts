interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_KEYS = 10_000;

/** Counts hits per key in a fixed window. In memory, so it covers one process. */
export class RateLimiter {
  private readonly hits = new Map<string, Bucket>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Seconds until `key` may try again, or 0 when it still has attempts left. */
  retryAfter(key: string): number {
    const bucket = this.hits.get(key);
    const now = Date.now();
    if (!bucket || now > bucket.resetAt || bucket.count < this.max) return 0;
    return Math.floor((bucket.resetAt - now) / 1000) + 1;
  }

  hit(key: string): void {
    const now = Date.now();
    if (this.hits.size > MAX_KEYS) this.prune(now);
    const bucket = this.hits.get(key);
    if (!bucket || now > bucket.resetAt) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      bucket.count++;
    }
  }

  clear(key: string): void {
    this.hits.delete(key);
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.hits) {
      if (now > bucket.resetAt) this.hits.delete(key);
    }
  }
}
