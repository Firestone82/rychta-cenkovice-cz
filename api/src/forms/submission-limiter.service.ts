import { Injectable } from '@nestjs/common';
import { tooManyRequests } from '../common/api-error.js';
import { RateLimiter } from '../common/rate-limiter.js';

/** At most 8 public form submissions per address in 10 minutes, all forms together. */
@Injectable()
export class SubmissionLimiter {
  private readonly submissions = new RateLimiter(8, 10 * 60_000);

  /** Counts one submission, or throws 429 when the address has used up its allowance. */
  count(ip: string): void {
    const key = `form:${ip}`;
    const wait = this.submissions.retryAfter(key);
    if (wait) throw tooManyRequests(wait);
    this.submissions.hit(key);
  }
}
