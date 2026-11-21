import { extname, join, resolve } from 'node:path';
import express, { type RequestHandler } from 'express';
import { MediaService } from '../photos/media.service.js';

/** Build output whose name carries a content hash (`main-PZMW6HP2.js`) never changes. */
const HASHED = /-[A-Z0-9]{8}\.(js|css)$/;
const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Serves the generated photo sizes under `/media`. */
export function media(dir: string): RequestHandler {
  const files = express.static(resolve(dir), { index: false, immutable: true, maxAge: '365d' });
  return (req, res) => {
    const missing = () => void res.status(404).end();
    if (MediaService.isMediaName(req.path.slice(1))) files(req, res, missing);
    else missing();
  };
}

/**
 * Serves the built Angular application, falling back to index.html for client-side routes.
 * Used when the API and the website run as one process (`RC_WEB_DIR`).
 */
export function webApp(dir: string): RequestHandler {
  const root = resolve(dir);
  const files = express.static(root, {
    index: false,
    setHeaders(res, path) {
      // Fonts, bundled images, the video and icons may be reused for a week.
      const policy = HASHED.test(path)
        ? IMMUTABLE
        : path.endsWith('.html')
          ? 'no-cache'
          : 'public, max-age=604800';
      res.setHeader('Cache-Control', policy);
    },
  });
  return (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') return void res.status(404).end();
    files(req, res, () => {
      if (extname(req.path)) return void res.status(404).end();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(join(root, 'index.html'));
    });
  };
}
