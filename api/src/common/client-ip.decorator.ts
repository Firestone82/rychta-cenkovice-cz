import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Address of the caller. Behind a reverse proxy it needs `RC_TRUST_PROXY`. */
export const clientIp = (req: Request): string => req.ip ?? req.socket.remoteAddress ?? '';

export const ClientIp = createParamDecorator((_: unknown, context: ExecutionContext) =>
  clientIp(context.switchToHttp().getRequest<Request>()),
);
