import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { clientIp } from '../common/client-ip.decorator.js';
import type { ClientInfo } from './session.service.js';

export const Client = createParamDecorator((_: unknown, context: ExecutionContext): ClientInfo => {
  const req = context.switchToHttp().getRequest<Request>();
  return { ip: clientIp(req), userAgent: req.get('user-agent') ?? '' };
});
