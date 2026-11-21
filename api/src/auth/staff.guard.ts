import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../common/api-error.js';
import type { AuthenticatedRequest } from './access-token.guard.js';

/** After `AccessTokenGuard`: lets administrators and staff through, not read-only accounts. */
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (user.role !== 'admin' && user.role !== 'staff') {
      throw new ApiError(HttpStatus.FORBIDDEN, 'forbidden', 'This account can only read.');
    }
    return true;
  }
}
