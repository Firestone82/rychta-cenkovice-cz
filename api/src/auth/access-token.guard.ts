import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApiError } from '../common/api-error.js';
import { isUserRole } from '../users/user-role.js';
import { AccessTokenService, type SessionUser } from './access-token.service.js';

export type AuthenticatedRequest = Request & { user: SessionUser };

const REALM = 'Bearer realm="rychta-admin"';

/** Lets a request through only with a valid access token of an account of the administration. */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokens: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (req.get('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'unauthorized', 'Sign in to continue.', {
        headers: { 'WWW-Authenticate': REALM },
      });
    }
    const user = await this.tokens.verify(token);
    if (!user) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'token_expired',
        'The access token is invalid or has expired.',
        { headers: { 'WWW-Authenticate': `${REALM}, error="invalid_token"` } },
      );
    }
    if (!isUserRole(user.role)) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'forbidden',
        'This account cannot use the administration.',
      );
    }
    req.user = user;
    return true;
  }
}
