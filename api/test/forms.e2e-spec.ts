import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { day, TestApp } from './support/test-app.js';

/** Stands in for hCaptcha: accepts the answer `good`, once, and records what it was asked. */
class FakeCaptcha {
  readonly requests: URLSearchParams[] = [];
  status = 200;
  errorCodes: string[] = [];
  private readonly used = new Set<string>();
  private readonly server: Server;

  constructor() {
    this.server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString()));
      req.on('end', () => {
        const form = new URLSearchParams(body);
        this.requests.push(form);
        const answer = form.get('response') ?? '';
        const success = this.errorCodes.length === 0 && answer === 'good' && !this.used.has(answer);
        this.used.add(answer);
        res.writeHead(this.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success, 'error-codes': this.errorCodes }));
      });
    });
  }

  async listen(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/siteverify`;
  }

  reset(): void {
    this.requests.length = 0;
    this.used.clear();
    this.status = 200;
    this.errorCodes = [];
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}

const fields = (res: { body: unknown }) =>
  (res.body as { error: { fields: Record<string, string> } }).error.fields;
const code = (res: { body: unknown }) => (res.body as { error: { code: string } }).error.code;

const contact = (overrides: Record<string, unknown> = {}) => ({
  name: 'Eva Nováková',
  email: 'eva@example.com',
  message: 'Dobrý den, máte volno?',
  consent: true,
  ...overrides,
});

describe('Public forms with hCaptcha', () => {
  const captcha = new FakeCaptcha();
  let t: TestApp;
  let apartment: number;

  beforeAll(async () => {
    t = await TestApp.create({
      RC_HCAPTCHA_SITEKEY: 'site-key',
      RC_HCAPTCHA_SECRET: 'secret-key',
      RC_HCAPTCHA_VERIFY_URL: await captcha.listen(),
    });
    [apartment] = await t.apartmentIds();
  });
  afterAll(async () => {
    await t.close();
    await captcha.close();
  });
  beforeEach(() => {
    captcha.reset();
    t.newVisitor();
  });

  const booking = (overrides: Record<string, unknown> = {}) => ({
    apartment_ids: [apartment],
    check_in: day(10),
    check_out: day(13),
    guests: 2,
    name: 'Jan Test',
    email: 'jan@example.com',
    phone: '+420 600 000 000',
    consent: true,
    ...overrides,
  });

  it('tells the website which site key to render the widget with', async () => {
    const res = await t.call('get', '/config').expect(200);
    expect(res.body).toEqual({ hcaptcha_sitekey: 'site-key' });
    expect(res.get('Cache-Control')).toBe('public, max-age=300');
  });

  it('wants an answer with every form', async () => {
    expect(fields(await t.call('post', '/contact').send(contact()).expect(422))).toEqual({
      captcha: 'required',
    });
    expect(fields(await t.call('post', '/bookings').send(booking()).expect(422))).toEqual({
      captcha: 'required',
    });
    expect(captcha.requests).toHaveLength(0);
  });

  it('checks the answer with hCaptcha, sending the secret, the site key and the visitor’s address', async () => {
    await t
      .call('post', '/contact')
      .send(contact({ captcha_token: 'good' }))
      .expect(204);
    expect(captcha.requests).toHaveLength(1);
    expect(Object.fromEntries(captcha.requests[0])).toMatchObject({
      secret: 'secret-key',
      sitekey: 'site-key',
      response: 'good',
    });
    expect(captcha.requests[0].get('remoteip')).toMatch(/^203\.0\.113\./);
  });

  it('refuses a wrong answer and stores nothing', async () => {
    const res = await t
      .call('post', '/bookings')
      .send(booking({ captcha_token: 'bad' }))
      .expect(422);
    expect(fields(res)).toEqual({ captcha: 'invalid' });
    expect(await t.mails()).toHaveLength(1);
  });

  it('does not spend the answer while other fields are still wrong', async () => {
    const res = await t
      .call('post', '/bookings')
      .send(booking({ captcha_token: 'good', guests: 40 }))
      .expect(422);
    expect(fields(res)).toEqual({ guests: 'over_capacity' });
    expect(captcha.requests).toHaveLength(0);
    await t
      .call('post', '/bookings')
      .send(booking({ captcha_token: 'good' }))
      .expect(201);
  });

  it('does not ask hCaptcha about a bot caught by the hidden field', async () => {
    await t
      .call('post', '/contact')
      .send(contact({ website: 'https://spam.example' }))
      .expect(204);
    expect(captcha.requests).toHaveLength(0);
  });

  it('answers 503 when hCaptcha is down or our keys are wrong, instead of blaming the visitor', async () => {
    captcha.status = 500;
    const down = await t
      .call('post', '/contact')
      .send(contact({ captcha_token: 'good' }))
      .expect(503);
    expect(code(down)).toBe('captcha_unavailable');

    captcha.reset();
    captcha.errorCodes = ['invalid-input-secret'];
    const keys = await t
      .call('post', '/contact')
      .send(contact({ captcha_token: 'good' }))
      .expect(503);
    expect(code(keys)).toBe('captcha_unavailable');
  });

  it('allows eight submissions from one address in ten minutes, over both forms', async () => {
    for (let submission = 0; submission < 8; submission++) {
      await t
        .call('post', submission % 2 ? '/contact' : '/bookings')
        .send({})
        .expect(422);
    }
    const limited = await t
      .call('post', '/contact')
      .send(contact({ captcha_token: 'good' }))
      .expect(429);
    expect(code(limited)).toBe('rate_limited');
    expect(Number(limited.get('Retry-After'))).toBeGreaterThan(0);
    expect(captcha.requests).toHaveLength(0);

    t.newVisitor();
    await t
      .call('post', '/contact')
      .send(contact({ captcha_token: 'good' }))
      .expect(204);
  });
});
