import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/** Argon2id with the OWASP minimum: 19 MiB of memory, 2 passes, 1 thread. */
const ARGON2 = { memoryCost: 19 * 1024, timeCost: 2, parallelism: 1, outputLen: 32 };

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 256;

@Injectable()
export class PasswordService {
  private readonly placeholder = hash('timing-equalisation-placeholder', ARGON2);

  hash(password: string): Promise<string> {
    return hash(password, ARGON2);
  }

  /**
   * Without a stored hash (no such account) a placeholder is checked instead, so an unknown
   * e-mail takes as long to reject as a wrong password.
   */
  async verify(password: string, stored: string | undefined): Promise<boolean> {
    try {
      const matches = await verify(stored ?? (await this.placeholder), password);
      return matches && stored !== undefined;
    } catch {
      return false;
    }
  }

  /** Counted in characters, not bytes, so "ž" is one. */
  acceptable(password: string): boolean {
    return (
      Array.from(password).length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH
    );
  }
}
