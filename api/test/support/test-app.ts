import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { API_PREFIX, configureApp } from '../../src/app.setup.js';
import { addDays, today } from '../../src/common/dates.util.js';
import { MailService } from '../../src/mail/mail.service.js';
import { AdminBootstrapService } from '../../src/users/admin-bootstrap.service.js';

export const ADMIN = { email: 'admin@example.com', password: 'correct horse battery' };

const DATABASE_URL =
  process.env['RC_TEST_DATABASE_URL'] ?? 'postgres://rychta:rychta@localhost:5432/rychta_test';

/** A date `offset` days from today at the house. */
export const day = (offset: number): string => addDays(today(), offset);

export type Method = 'get' | 'post' | 'patch' | 'delete';

/** The application on an empty, freshly migrated and seeded database. */
export class TestApp {
  /** Keeps cookies between requests, like the browser of the administrator. */
  readonly agent: ReturnType<typeof request.agent>;
  private accessToken = '';
  private visitors = 1;

  private constructor(
    readonly app: NestExpressApplication,
    private readonly dir: string,
  ) {
    this.agent = request.agent(app.getHttpServer() as App);
  }

  static async create(env: Record<string, string> = {}): Promise<TestApp> {
    const database = new pg.Client({ connectionString: DATABASE_URL });
    await database.connect();
    await database.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await database.end();

    const dir = mkdtempSync(join(tmpdir(), 'rychta-e2e-'));
    Object.assign(process.env, {
      RC_ENV: 'test',
      RC_DATABASE_URL: DATABASE_URL,
      RC_MEDIA_DIR: join(dir, 'media'),
      RC_OUTBOX_DIR: join(dir, 'outbox'),
      RC_WEB_DIR: '',
      RC_JWT_SECRET: 'test-secret-test-secret-test-secret-0123',
      RC_ADMIN_EMAIL: ADMIN.email,
      RC_ADMIN_PASSWORD: ADMIN.password,
      RC_SMTP_HOST: '',
      RC_HCAPTCHA_SITEKEY: '',
      RC_HCAPTCHA_SECRET: '',
      RC_TRUST_PROXY: 'true',
      ...env,
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] });
    configureApp(app);
    await app.init();
    await app.get(AdminBootstrapService).run();
    return new TestApp(app, dir);
  }

  async close(): Promise<void> {
    await this.app.close();
    rmSync(this.dir, { recursive: true, force: true });
  }

  /** A request to `/api/v1<path>` with the headers the website sends. */
  call(method: Method, path: string) {
    const call = this.agent[method](`/${API_PREFIX}${path}`)
      .set('X-Requested-With', 'rychta-web')
      .set('X-Forwarded-For', `203.0.113.${this.visitors}`);
    return this.accessToken ? call.set('Authorization', `Bearer ${this.accessToken}`) : call;
  }

  /** The same request from another browser: no cookies and no access token. */
  stranger(method: Method, path: string) {
    return request(this.app.getHttpServer() as App)
      [method](`/${API_PREFIX}${path}`)
      .set('X-Requested-With', 'rychta-web')
      .set('X-Forwarded-For', `203.0.113.${this.visitors}`);
  }

  /** Runs SQL directly, for states the API cannot be brought into in a test's time. */
  sql<T = unknown>(query: string, parameters: unknown[] = []): Promise<T[]> {
    return this.app.get(DataSource).query(query, parameters);
  }

  /** Later requests come from a new address, with its own rate limits. */
  newVisitor(): void {
    this.visitors++;
  }

  async login(): Promise<void> {
    const res = await this.call('post', '/auth/login').send(ADMIN).expect(200);
    this.useToken((res.body as { access_token: string }).access_token);
  }

  useToken(token: string): void {
    this.accessToken = token;
  }

  /** Ids of the seeded apartments, in the order of the public list. */
  async apartmentIds(): Promise<number[]> {
    const res = await this.call('get', '/apartments').expect(200);
    return (res.body as { items: { id: number }[] }).items.map((apartment) => apartment.id);
  }

  /** Every e-mail written so far, as the text files of the outbox. */
  async mails(): Promise<string[]> {
    await this.app.get(MailService).idle();
    const outbox = join(this.dir, 'outbox');
    try {
      return readdirSync(outbox).map((name) => readFileSync(join(outbox, name), 'utf8'));
    } catch {
      return [];
    }
  }
}

/** The value of the refresh cookie set by a response. */
export function refreshCookie(res: request.Response): string {
  const cookies = res.get('Set-Cookie') ?? [];
  const cookie = cookies.find((value) => value.startsWith('rc_refresh='));
  return cookie?.slice('rc_refresh='.length).split(';')[0] ?? '';
}
