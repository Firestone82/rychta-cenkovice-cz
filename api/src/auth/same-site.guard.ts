import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiError } from '../common/api-error.js';
import { type AppConfig, InjectConfig } from '../config/app.config.js';

/**
 * Hardens the cookie-authenticated endpoints against CSRF on top of SameSite=Strict: the custom
 * header cannot be sent cross-origin without a CORS preflight, and a present Origin header must
 * be an allowed origin or the API's own.
 */
@Injectable()
export class SameSiteGuard implements CanActivate {
  constructor(@InjectConfig() private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.get('x-requested-with') !== 'rychta-web') {
      throw new ApiError(HttpStatus.FORBIDDEN, 'forbidden', 'Missing X-Requested-With header.');
    }
    const origin = req.get('origin')?.replace(/\/+$/, '');
    const own = `${req.protocol}://${req.get('host')}`;
    if (origin && origin !== own && !this.config.allowedOrigins.includes(origin)) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'forbidden', 'Origin not allowed.');
    }
    return true;
  }
}
