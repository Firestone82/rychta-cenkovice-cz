import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TestApp } from './support/test-app.js';

describe('The application around the endpoints', () => {
  const webDir = mkdtempSync(join(tmpdir(), 'rychta-web-'));
  let t: TestApp;

  beforeAll(async () => {
    mkdirSync(join(webDir, 'media'));
    writeFileSync(join(webDir, 'index.html'), '<!doctype html><title>Rychta</title>');
    writeFileSync(join(webDir, 'main-ABCD1234.js'), 'console.log(1)');
    writeFileSync(join(webDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    t = await TestApp.create({ RC_WEB_DIR: webDir, RC_API_DOCS: 'true' });
  });
  afterAll(async () => {
    await t.close();
    rmSync(webDir, { recursive: true, force: true });
  });

  it('reports its health and runs without hCaptcha when no keys are set', async () => {
    expect((await t.call('get', '/health').expect(200)).body).toEqual({ status: 'ok' });
    expect((await t.call('get', '/config').expect(200)).body).toEqual({ hcaptcha_sitekey: '' });
  });

  it('answers unknown endpoints, wrong methods and broken JSON in the API’s error format', async () => {
    const missing = await t.call('get', '/nope').expect(404);
    expect(missing.body).toEqual({
      error: { code: 'not_found', message: 'Unknown API endpoint.' },
    });
    await t.call('delete', '/apartments').expect(404);

    const broken = await t
      .call('post', '/contact')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);
    expect((broken.body as { error: { code: string } }).error.code).toBe('bad_request');

    const large = await t
      .call('post', '/contact')
      .send({ message: 'x'.repeat(1_100_000) })
      .expect(413);
    expect((large.body as { error: { code: string } }).error.code).toBe('too_large');
  });

  it('sends the security headers, never caching what needs a session', async () => {
    const api = await t.call('get', '/apartments').expect(200);
    expect(api.get('X-Content-Type-Options')).toBe('nosniff');
    expect(api.get('X-Frame-Options')).toBe('DENY');
    expect(api.get('Content-Security-Policy')).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(api.get('X-Powered-By')).toBeUndefined();

    const admin = await t.call('get', '/admin/bookings').expect(401);
    expect(admin.get('Cache-Control')).toBe('no-store');
    const auth = await t.call('post', '/auth/refresh').expect(401);
    expect(auth.get('Cache-Control')).toBe('no-store');
  });

  it('lets the website’s origin call the API with credentials, and no other', async () => {
    const allowed = await t.agent
      .options('/api/v1/auth/login')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-requested-with')
      .expect(204);
    expect(allowed.get('Access-Control-Allow-Origin')).toBe('http://localhost:4200');
    expect(allowed.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(allowed.get('Access-Control-Allow-Headers')).toContain('X-Requested-With');

    const other = await t.agent
      .get('/api/v1/apartments')
      .set('Origin', 'https://evil.example')
      .expect(200);
    expect(other.get('Access-Control-Allow-Origin')).toBeUndefined();
  });

  it('describes every endpoint in the OpenAPI document', async () => {
    await t.agent.get('/api/docs').expect(200);
    const res = await t.agent.get('/api/docs-json').expect(200);
    const paths = Object.keys((res.body as { paths: object }).paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/v1/apartments',
        '/api/v1/availability',
        '/api/v1/bookings',
        '/api/v1/contact',
        '/api/v1/auth/login',
        '/api/v1/admin/bookings/{id}',
        '/api/v1/admin/photos',
      ]),
    );
  });

  it('serves the built website with client-side routes falling back to index.html', async () => {
    const home = await t.agent.get('/').expect(200);
    expect(home.text).toContain('<title>Rychta</title>');
    expect(home.get('Cache-Control')).toBe('no-cache');
    expect(home.get('Content-Security-Policy')).toContain("script-src 'self'");
    expect(home.get('Permissions-Policy')).toContain('camera=()');

    const route = await t.agent.get('/en/apartments/apartment-2').expect(200);
    expect(route.text).toContain('<title>Rychta</title>');

    const script = await t.agent.get('/main-ABCD1234.js').expect(200);
    expect(script.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    const icon = await t.agent.get('/favicon.svg').expect(200);
    expect(icon.get('Cache-Control')).toBe('public, max-age=604800');

    await t.agent.get('/missing.js').expect(404);
    await t.agent.post('/').expect(404);
    await t.call('get', '/nope').expect(404);
  });
});
