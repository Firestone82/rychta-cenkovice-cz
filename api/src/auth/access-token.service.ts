import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type AppConfig, InjectConfig } from '../config/app.config.js';

/** Who a request is made by, read from its access token. */
export interface SessionUser {
  id: number;
  role: string;
  name: string;
}

interface AccessClaims {
  sub: string;
  role: string;
  name: string;
}

export const ACCESS_TOKEN_AUDIENCE = 'rychta-admin';

/** Short-lived JWT access tokens. They live only in the browser's memory. */
@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwt: JwtService,
    @InjectConfig() private readonly config: AppConfig,
  ) {}

  get lifetimeSeconds(): number {
    return Math.floor(this.config.jwt.accessTtl / 1000);
  }

  issue(user: SessionUser): Promise<string> {
    return this.jwt.signAsync(
      { role: user.role, name: user.name },
      { subject: String(user.id), jwtid: randomBytes(12).toString('base64url') },
    );
  }

  /** Null when the signature, algorithm, issuer, audience or expiry does not hold. */
  async verify(token: string): Promise<SessionUser | null> {
    try {
      const claims = await this.jwt.verifyAsync<AccessClaims>(token);
      const id = Number(claims.sub);
      return Number.isInteger(id) && id > 0 ? { id, role: claims.role, name: claims.name } : null;
    } catch {
      return null;
    }
  }
}
