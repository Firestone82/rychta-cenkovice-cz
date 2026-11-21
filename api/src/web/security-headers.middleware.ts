import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/app.config.js';

export const API_DOCS_PATH = '/api/docs';

/**
 * The content security policy of the website. With hCaptcha switched on, its script, styles,
 * frame and requests are allowed from hcaptcha.com and nowhere else. Inline styles stay allowed
 * because Angular injects component styles at runtime; scripts are never inline.
 */
export function webContentSecurityPolicy(hcaptcha: boolean): string {
  const h = hcaptcha ? ' https://hcaptcha.com https://*.hcaptcha.com' : '';
  return [
    "default-src 'self'",
    `script-src 'self'${h}`,
    `style-src 'self' 'unsafe-inline'${h}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "media-src 'self'",
    `connect-src 'self'${h}`,
    `frame-src${h || " 'none'"}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Swagger UI starts from an inline script. */
const DOCS_POLICY =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'";

export function securityHeaders(config: AppConfig): RequestHandler {
  const webPolicy = webContentSecurityPolicy(config.hcaptcha.secret !== '');
  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    if (config.production) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    if (req.path.startsWith(API_DOCS_PATH)) {
      res.setHeader('Content-Security-Policy', DOCS_POLICY);
    } else if (req.path.startsWith('/api/')) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
      if (req.path.includes('/auth/') || req.path.includes('/admin/')) {
        res.setHeader('Cache-Control', 'no-store');
      }
    } else {
      res.setHeader('Content-Security-Policy', webPolicy);
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    }
    next();
  };
}
