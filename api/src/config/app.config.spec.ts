import { loadConfig } from './app.config.js';

const SECRET = 'a-secret-of-at-least-thirty-two-characters';

describe('configuration', () => {
  it('has working defaults for development', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      env: 'development',
      production: false,
      port: 8080,
      cookieSecure: false,
      apiDocs: true,
      allowedOrigins: ['http://localhost:4200'],
      database: {
        url: 'postgres://rychta:rychta@localhost:5432/rychta',
        ssl: false,
        migrate: true,
      },
      jwt: { accessTtl: 600_000, refreshTtl: 7 * 86_400_000, sessionTtl: 30 * 86_400_000 },
    });
    expect(config.jwt.secret.length).toBeGreaterThanOrEqual(32);
  });

  it('is strict in production: a real secret, secure cookies, no API docs', () => {
    expect(() => loadConfig({ RC_ENV: 'production' })).toThrow(/RC_JWT_SECRET/);
    const config = loadConfig({ RC_ENV: 'production', RC_JWT_SECRET: SECRET });
    expect(config).toMatchObject({ production: true, cookieSecure: true, apiDocs: false });
  });

  it('reads durations, lists and flags', () => {
    const config = loadConfig({
      RC_ACCESS_TTL: '5m',
      RC_REFRESH_TTL: '168h',
      RC_ALLOWED_ORIGINS: 'https://www.rychtacenkovice.cz/, https://rychtacenkovice.cz',
      RC_PUBLIC_URL: 'https://www.rychtacenkovice.cz/',
      RC_TRUST_PROXY: 'true',
      RC_DATABASE_MIGRATE: 'false',
    });
    expect(config.jwt).toMatchObject({ accessTtl: 300_000, refreshTtl: 7 * 86_400_000 });
    expect(config.allowedOrigins).toEqual([
      'https://www.rychtacenkovice.cz',
      'https://rychtacenkovice.cz',
    ]);
    expect(config.publicUrl).toBe('https://www.rychtacenkovice.cz');
    expect(config.trustProxy).toBe(true);
    expect(config.database.migrate).toBe(false);
  });

  it('refuses long-lived access tokens, half-configured hCaptcha and malformed values', () => {
    expect(() => loadConfig({ RC_ACCESS_TTL: '31m' })).toThrow(/30m or less/);
    expect(() => loadConfig({ RC_HCAPTCHA_SITEKEY: 'only-one' })).toThrow(/set together/);
    expect(() => loadConfig({ RC_ACCESS_TTL: 'soon' })).toThrow(/Invalid configuration/);
    expect(() => loadConfig({ RC_PORT: '99999' })).toThrow(/Invalid configuration/);
  });
});
