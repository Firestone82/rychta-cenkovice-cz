import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { type Observable, of } from 'rxjs';
import { clientIp } from '../common/client-ip.decorator.js';
import { SubmissionLimiter } from './submission-limiter.service.js';

const HONEYPOT_REPLY = 'honeypot-reply';

/** What a bot gets instead of the real response; without it the body is empty. */
export const HoneypotReply = (reply: () => unknown) => SetMetadata(HONEYPOT_REPLY, reply);

/**
 * Guards a public form before its body is even validated. A filled-in `website` field, which
 * real visitors never see, is answered as if the form worked and nothing is stored. Everything
 * else counts towards the rate limit.
 */
@Injectable()
export class PublicFormInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: SubmissionLimiter,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const honeypot: unknown = (req.body as { website?: unknown } | undefined)?.website;
    if (typeof honeypot === 'string' && honeypot !== '') {
      const reply = this.reflector.get<(() => unknown) | undefined>(
        HONEYPOT_REPLY,
        context.getHandler(),
      );
      return of(reply?.());
    }
    this.limiter.count(clientIp(req));
    return next.handle();
  }
}
