import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { MediaService } from '../photos/media.service.js';

/** Build output whose name carries a content hash (`main-PZMW6HP2.js`) never changes. */
const HASHED = /-[A-Z0-9]{8}\.(js|css)$/;
const IMMUTABLE = 'public, max-age=31536000, immutable';
/** Files the website renderer writes itself; every other missing file is a plain 404. */
const RENDERED_FILES = new Set(['/robots.txt', '/sitemap.xml']);

/** Serves the generated photo sizes under `/media`. */
export function media(dir: string): RequestHandler {
  const files = express.static(resolve(dir), { index: false, immutable: true, maxAge: '365d' });
  return (req, res) => {
    const missing = () => void res.status(404).end();
    if (MediaService.isMediaName(req.path.slice(1))) files(req, res, missing);
    else missing();
  };
}

/** What `createRenderer` in `web/src/server.ts` takes. */
export interface RenderOptions {
  /** Where the renderer reaches this API, e.g. `http://127.0.0.1:8080`. */
  apiOrigin: string;
  /** Public address of the website, for canonical links and the sitemap. */
  siteUrl: string;
  /** Host names the pages may be requested under. */
  allowedHosts: string[];
}

type PageHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
interface WebServerModule {
  createRenderer(options: {
    allowedHosts: string[];
    context: { apiOrigin: string; siteUrl: string };
  }): PageHandler;
}

const logger = new Logger('Website');

/**
 * Serves the built Angular application. With the server bundle (`<dir>/browser` and
 * `<dir>/server`) pages are rendered here, so visitors and search engines get finished HTML;
 * without it, or when rendering fails, the browser renders the page from the plain shell.
 * Used when the API and the website run as one process (`RC_WEB_DIR`).
 */
export function webApp(dir: string, options: RenderOptions): RequestHandler {
  const rendered = existsSync(join(dir, 'browser'));
  const root = resolve(rendered ? join(dir, 'browser') : dir);
  const shell = join(
    root,
    existsSync(join(root, 'index.csr.html')) ? 'index.csr.html' : 'index.html',
  );
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
  const render = rendered ? loadRenderer(join(dir, 'server', 'server.mjs'), options) : null;

  return (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') return void res.status(404).end();
    files(req, res, () => {
      const plain = () => {
        if (extname(req.path)) return void res.status(404).end();
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(shell);
      };
      if (!render || (extname(req.path) && !RENDERED_FILES.has(req.path))) return plain();
      res.setHeader('Cache-Control', 'no-cache');
      render
        .then((handler) =>
          handler(req, res, (error?: unknown) => {
            if (error) logger.error(`Rendering ${req.path} failed: ${reason(error)}`);
            if (!res.headersSent) plain();
          }),
        )
        .catch((error: unknown) => {
          logger.error(`Website renderer not available: ${reason(error)}`);
          if (!res.headersSent) plain();
        });
    });
  };
}

function loadRenderer(file: string, options: RenderOptions): Promise<PageHandler> {
  return (import(pathToFileURL(file).href) as Promise<WebServerModule>).then((module) =>
    module.createRenderer({
      allowedHosts: options.allowedHosts,
      context: { apiOrigin: options.apiOrigin, siteUrl: options.siteUrl },
    }),
  );
}

/** Host names of the public address and the allowed origins, plus this machine. */
export function renderHosts(urls: string[]): string[] {
  const hosts = urls.flatMap((url) => {
    try {
      return [new URL(url).hostname];
    } catch {
      return [];
    }
  });
  return [...new Set([...hosts, 'localhost', '127.0.0.1'])];
}

function reason(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : JSON.stringify(error);
}
