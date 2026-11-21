import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, IsNull, LessThan, Repository } from 'typeorm';
import { type AppConfig, InjectConfig } from '../config/app.config.js';
import { RefreshToken } from './refresh-token.entity.js';

/**
 * - `invalid`: unknown, expired or revoked token.
 * - `race`: the token was rotated a moment ago (two tabs refreshing at once). The browser
 *   already holds the successor cookie, so the client may simply retry.
 * - `reuse`: an already rotated token came back, which means it was copied. The session is revoked.
 */
export type RefreshFailure = 'invalid' | 'race' | 'reuse';

export class RefreshError extends Error {
  constructor(readonly reason: RefreshFailure) {
    super(`refresh token: ${reason}`);
  }
}

export interface IssuedRefresh {
  token: string;
  expiresAt: Date;
}

/** Where a session is used from; kept with the token for the record. */
export interface ClientInfo {
  ip: string;
  userAgent: string;
}

/** How long after rotation a repeated token counts as a harmless race. */
const REUSE_GRACE = 20_000;
const DAY = 86_400_000;

const randomToken = (bytes: number): string => randomBytes(bytes).toString('base64url');
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/** Rotating refresh tokens: every token works once, and reuse ends the whole session. */
@Injectable()
export class SessionService {
  private readonly logger = new Logger('Auth');

  constructor(
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    @InjectConfig() private readonly config: AppConfig,
  ) {}

  /** Opens a session for a fresh sign-in. */
  start(userId: number, client: ClientInfo): Promise<IssuedRefresh> {
    const now = new Date();
    const sessionEnd = new Date(now.getTime() + this.config.jwt.sessionTtl);
    return this.issue(this.tokens.manager, userId, randomToken(16), now, sessionEnd, client);
  }

  /** Exchanges a valid token for its successor. Throws `RefreshError` otherwise. */
  async rotate(
    token: string,
    client: ClientInfo,
  ): Promise<{ userId: number; refresh: IssuedRefresh }> {
    // A failure is returned, not thrown, so that revoking the session on reuse is committed.
    const outcome = await this.dataSource.transaction(async (manager) => {
      const tokens = manager.getRepository(RefreshToken);
      const current = await tokens.findOne({
        where: { tokenHash: hashToken(token) },
        lock: { mode: 'pessimistic_write' },
      });
      const now = new Date();
      if (!current || current.revokedAt) return 'invalid' as const;
      if (current.usedAt) {
        if (now.getTime() - current.usedAt.getTime() <= REUSE_GRACE) return 'race' as const;
        await tokens.update(
          { familyId: current.familyId, revokedAt: IsNull() },
          { revokedAt: now },
        );
        return 'reuse' as const;
      }
      if (now >= current.expiresAt || now >= current.familyExpiresAt) return 'invalid' as const;
      await tokens.update(current.id, { usedAt: now });
      const refresh = await this.issue(
        manager,
        current.userId,
        current.familyId,
        now,
        current.familyExpiresAt,
        client,
      );
      return { userId: current.userId, refresh };
    });
    if (typeof outcome === 'string') throw new RefreshError(outcome);
    return outcome;
  }

  /** Ends the session the token belongs to (sign-out). */
  async revokeByToken(token: string): Promise<void> {
    const current = await this.tokens.findOneBy({ tokenHash: hashToken(token) });
    if (!current) return;
    await this.tokens.update(
      { familyId: current.familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** Ends every session of a user (password change). */
  async revokeUser(userId: number): Promise<void> {
    await this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  /** Forgets tokens whose session ended more than a day ago. */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanup(): Promise<void> {
    const { affected } = await this.tokens.delete({
      familyExpiresAt: LessThan(new Date(Date.now() - DAY)),
    });
    if (affected) this.logger.log(`Removed ${affected} expired refresh tokens`);
  }

  private async issue(
    manager: EntityManager,
    userId: number,
    familyId: string,
    now: Date,
    sessionEnd: Date,
    client: ClientInfo,
  ): Promise<IssuedRefresh> {
    const token = randomToken(32);
    const slidingEnd = new Date(now.getTime() + this.config.jwt.refreshTtl);
    const expiresAt = slidingEnd < sessionEnd ? slidingEnd : sessionEnd;
    await manager.getRepository(RefreshToken).insert({
      userId,
      familyId,
      tokenHash: hashToken(token),
      expiresAt,
      familyExpiresAt: sessionEnd,
      userAgent: client.userAgent.slice(0, 300),
      ip: client.ip.slice(0, 64),
    });
    return { token, expiresAt };
  }
}
