import { randomBytes } from 'node:crypto';
import { Inject, Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const UNITS: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** A duration such as `10m`, `168h` or `30d`, in milliseconds. */
const duration = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value, ctx) => {
      const match = /^(\d+)([smhd])$/.exec(value.trim());
      if (!match) {
        ctx.addIssue({ code: 'custom', message: 'expected a duration such as 10m, 168h or 30d' });
        return z.NEVER;
      }
      return Number(match[1]) * UNITS[match[2]];
    });

const flag = z.stringbool().optional();
const url = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value) => value.trim().replace(/\/+$/, ''));

const envSchema = z.object({
  RC_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RC_HOST: z.string().default('0.0.0.0'),
  RC_PORT: z.coerce.number().int().min(1).max(65_535).default(8080),

  RC_DATABASE_URL: z.string().default('postgres://rychta:rychta@localhost:5432/rychta'),
  RC_DATABASE_SSL: flag,
  RC_DATABASE_MIGRATE: flag,

  RC_MEDIA_DIR: z.string().default('data/media'),
  RC_OUTBOX_DIR: z.string().default('data/outbox'),
  RC_WEB_DIR: z.string().default(''),

  RC_JWT_SECRET: z.string().default(''),
  RC_JWT_ISSUER: z.string().default('rychtacenkovice.cz'),
  RC_ACCESS_TTL: duration('10m'),
  RC_REFRESH_TTL: duration('7d'),
  RC_SESSION_TTL: duration('30d'),
  RC_COOKIE_SECURE: flag,

  RC_ALLOWED_ORIGINS: z.string().default('http://localhost:4200'),
  RC_TRUST_PROXY: flag,
  RC_PUBLIC_URL: url('http://localhost:4200'),
  RC_API_DOCS: flag,

  RC_MAIL_FROM: z.string().default('Rychta Čenkovice <rezervace@rychtacenkovice.cz>'),
  RC_MAIL_TO: z.string().default('rychtacenkovice@seznam.cz'),
  RC_SMTP_HOST: z.string().default(''),
  RC_SMTP_PORT: z.coerce.number().int().default(587),
  RC_SMTP_USERNAME: z.string().default(''),
  RC_SMTP_PASSWORD: z.string().default(''),
  RC_SMTP_TLS: z.enum(['starttls', 'tls', 'none']).default('starttls'),

  RC_ADMIN_EMAIL: z.string().default(''),
  RC_ADMIN_PASSWORD: z.string().default(''),

  RC_PHOTO_SOURCE_URL: url('https://www.rychtacenkovice.cz/userFiles'),

  RC_HCAPTCHA_SITEKEY: z.string().default(''),
  RC_HCAPTCHA_SECRET: z.string().default(''),
  RC_HCAPTCHA_VERIFY_URL: z.string().default('https://api.hcaptcha.com/siteverify'),
});

export type AppConfig = ReturnType<typeof loadConfig>;

const MAX_ACCESS_TTL = 30 * UNITS.m;

/** Reads the `RC_*` settings. Throws with every problem listed when something is wrong. */
export function loadConfig(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(parsed.error)}`);
  }
  const e = parsed.data;
  const production = e.RC_ENV === 'production';
  const logger = new Logger('Config');

  if (e.RC_ACCESS_TTL > MAX_ACCESS_TTL) {
    throw new Error('RC_ACCESS_TTL must be 30m or less: access tokens are meant to be short-lived');
  }
  if (!e.RC_HCAPTCHA_SITEKEY !== !e.RC_HCAPTCHA_SECRET) {
    throw new Error(
      'RC_HCAPTCHA_SITEKEY and RC_HCAPTCHA_SECRET must be set together (or both left empty)',
    );
  }

  let jwtSecret = e.RC_JWT_SECRET;
  if (jwtSecret.length < 32) {
    if (production) {
      throw new Error('RC_JWT_SECRET must be set to at least 32 random characters in production');
    }
    // Access tokens stop working on restart; the refresh token in the database signs the administrator back in.
    jwtSecret = randomBytes(48).toString('base64');
    if (e.RC_ENV === 'development') {
      logger.warn('RC_JWT_SECRET not set, using a random development secret');
    }
  }
  if (production && !e.RC_HCAPTCHA_SECRET) {
    logger.warn(
      'hCaptcha keys not set: the public forms are protected only by the rate limit and the honeypot',
    );
  }

  return {
    env: e.RC_ENV,
    production,
    host: e.RC_HOST,
    port: e.RC_PORT,
    database: {
      url: e.RC_DATABASE_URL,
      ssl: e.RC_DATABASE_SSL ?? false,
      migrate: e.RC_DATABASE_MIGRATE ?? true,
    },
    mediaDir: e.RC_MEDIA_DIR,
    outboxDir: e.RC_OUTBOX_DIR,
    webDir: e.RC_WEB_DIR,
    jwt: {
      secret: jwtSecret,
      issuer: e.RC_JWT_ISSUER,
      accessTtl: e.RC_ACCESS_TTL,
      refreshTtl: e.RC_REFRESH_TTL,
      sessionTtl: e.RC_SESSION_TTL,
    },
    cookieSecure: e.RC_COOKIE_SECURE ?? production,
    allowedOrigins: e.RC_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean),
    trustProxy: e.RC_TRUST_PROXY ?? false,
    publicUrl: e.RC_PUBLIC_URL,
    apiDocs: e.RC_API_DOCS ?? !production,
    mail: {
      from: e.RC_MAIL_FROM,
      to: e.RC_MAIL_TO,
      smtp: {
        host: e.RC_SMTP_HOST,
        port: e.RC_SMTP_PORT,
        username: e.RC_SMTP_USERNAME,
        password: e.RC_SMTP_PASSWORD,
        tls: e.RC_SMTP_TLS,
      },
    },
    admin: { email: e.RC_ADMIN_EMAIL, password: e.RC_ADMIN_PASSWORD },
    photoSourceUrl: e.RC_PHOTO_SOURCE_URL,
    hcaptcha: {
      siteKey: e.RC_HCAPTCHA_SITEKEY,
      secret: e.RC_HCAPTCHA_SECRET,
      verifyUrl: e.RC_HCAPTCHA_VERIFY_URL,
    },
  };
}

export const appConfig = registerAs('app', () => loadConfig(process.env));

export const InjectConfig = () => Inject(appConfig.KEY);
