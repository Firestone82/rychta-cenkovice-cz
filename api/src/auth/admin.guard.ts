import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../common/api-error.js';
import type { AuthenticatedRequest } from './access-token.guard.js';

/** After `AccessTokenGuard`: lets only administrators through, not staff accounts. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (user.role !== 'admin') {
      throw new ApiError(HttpStatus.FORBIDDEN, 'forbidden', 'Only an administrator can do this.');
    }
    return true;
  }
}
