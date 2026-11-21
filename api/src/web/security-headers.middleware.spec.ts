import { webContentSecurityPolicy } from './security-headers.middleware.js';

const directives = (policy: string) =>
  Object.fromEntries(policy.split('; ').map((directive) => [directive.split(' ')[0], directive]));

describe('content security policy of the website', () => {
  it('allows nothing from outside when hCaptcha is off', () => {
    const policy = webContentSecurityPolicy(false);
    expect(policy).not.toContain('http');
    expect(directives(policy)).toMatchObject({
      'script-src': "script-src 'self'",
      'frame-src': "frame-src 'none'",
      'frame-ancestors': "frame-ancestors 'none'",
      'object-src': "object-src 'none'",
    });
  });

  it('opens exactly what the hCaptcha widget needs', () => {
    const hcaptcha = 'https://hcaptcha.com https://*.hcaptcha.com';
    expect(directives(webContentSecurityPolicy(true))).toMatchObject({
      'script-src': `script-src 'self' ${hcaptcha}`,
      'style-src': `style-src 'self' 'unsafe-inline' ${hcaptcha}`,
      'connect-src': `connect-src 'self' ${hcaptcha}`,
      'frame-src': `frame-src ${hcaptcha}`,
      'img-src': "img-src 'self' data:",
    });
  });

  it('never allows inline scripts', () => {
    for (const enabled of [true, false]) {
      expect(directives(webContentSecurityPolicy(enabled))['script-src']).not.toContain('unsafe');
    }
  });
});
