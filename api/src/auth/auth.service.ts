import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiError, tooManyRequests, validationFailed } from '../common/api-error.js';
import { RateLimiter } from '../common/rate-limiter.js';
import { PasswordService } from '../users/password.service.js';
import type { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import {
  type ClientInfo,
  type IssuedRefresh,
  RefreshError,
  SessionService,
} from './session.service.js';

export interface SignedIn {
  user: User;
  refresh: IssuedRefresh;
}

const sessionExpired = () =>
  new ApiError(
    HttpStatus.UNAUTHORIZED,
    'session_expired',
    'The session has expired. Sign in again.',
  );

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');
  /** Failed sign-ins, counted per address and per account. */
  private readonly failures = new RateLimiter(5, 15 * 60_000);

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async signIn(rawEmail: string, password: string, client: ClientInfo): Promise<SignedIn> {
    const email = rawEmail.trim().toLowerCase();
    const keys = [`ip:${client.ip}`, `acct:${email}`];
    for (const key of keys) {
      const wait = this.failures.retryAfter(key);
      if (wait) throw tooManyRequests(wait);
    }
    const rejected = () =>
      new ApiError(HttpStatus.UNAUTHORIZED, 'invalid_credentials', 'Wrong e-mail or password.');
    if (!email || !password || password.length > 256) throw rejected();

    const user = await this.users.findByEmail(email);
    const matches = await this.passwords.verify(password, user?.passwordHash);
    if (!user || !matches) {
      for (const key of keys) this.failures.hit(key);
      this.logger.warn(`Failed sign-in for ${email} from ${client.ip}`);
      throw rejected();
    }
    this.failures.clear(`acct:${email}`);
    this.logger.log(`User ${user.id} signed in from ${client.ip}`);
    return { user, refresh: await this.sessions.start(user.id, client) };
  }

  async refresh(token: string, client: ClientInfo): Promise<SignedIn> {
    try {
      const { userId, refresh } = await this.sessions.rotate(token, client);
      const user = await this.users.findById(userId);
      if (!user) throw sessionExpired();
      return { user, refresh };
    } catch (error) {
      if (!(error instanceof RefreshError)) throw error;
      switch (error.reason) {
        case 'race':
          throw new ApiError(
            HttpStatus.CONFLICT,
            'refresh_race',
            'The session was just refreshed. Retry.',
          );
        case 'reuse':
          this.logger.warn(`Refresh token reuse from ${client.ip}, session revoked`);
          throw new ApiError(
            HttpStatus.UNAUTHORIZED,
            'session_revoked',
            'The session was ended for security reasons. Sign in again.',
          );
        default:
          throw sessionExpired();
      }
    }
  }

  signOut(token: string): Promise<void> {
    return this.sessions.revokeByToken(token);
  }

  /** Signs the user out everywhere, then opens a fresh session for this browser. */
  async changePassword(
    userId: number,
    current: string,
    next: string,
    client: ClientInfo,
  ): Promise<SignedIn> {
    const user = await this.users.findById(userId);
    if (!user || !(await this.passwords.verify(current, user.passwordHash))) {
      throw validationFailed({ current_password: 'wrong' });
    }
    if (!this.passwords.acceptable(next)) throw validationFailed({ new_password: 'too_short' });
    await this.users.setPassword(user.id, next);
    await this.sessions.revokeUser(user.id);
    return { user, refresh: await this.sessions.start(user.id, client) };
  }
}
