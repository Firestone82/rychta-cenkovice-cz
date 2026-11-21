import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import type { RenderContext } from './app/config/render.config';
import { robotsTxt, sitemapXml } from './app/utils/sitemap.util';

type Next = (error?: unknown) => void;
export type PageHandler = (req: IncomingMessage, res: ServerResponse, next: Next) => Promise<void>;

export interface RendererOptions {
  /** Host names the pages may be requested under; see Angular's SSRF protection. */
  allowedHosts?: string[];
  /** Passed to the website; without it the address of the request is used. */
  context?: RenderContext;
}

/**
 * Renders the pages of the website and answers robots.txt and sitemap.xml. Calls `next` for
 * anything else. The API mounts it after its static files (`api/src/web/static.middleware.ts`).
 */
export function createRenderer(options: RendererOptions = {}): PageHandler {
  const engine = new AngularNodeAppEngine({ allowedHosts: options.allowedHosts });
  return async (req, res, next) => {
    try {
      const requestOrigin = `http://${req.headers.host ?? 'localhost'}`;
      const origin = (options.context?.siteUrl ?? requestOrigin).replace(/\/+$/, '');
      const path = (req.url ?? '/').split('?')[0];
      if (path === '/robots.txt') return send(res, 'text/plain', robotsTxt(origin));
      if (path === '/sitemap.xml') {
        const apartments = await apartmentNumbers(options.context?.apiOrigin ?? requestOrigin);
        return send(res, 'application/xml', sitemapXml(origin, apartments));
      }
      const response = await engine.handle(req, options.context);
      if (response) await writeResponseToNodeResponse(response, res);
      else next();
    } catch (error) {
      next(error);
    }
  };
}

async function apartmentNumbers(apiOrigin: string): Promise<number[]> {
  const res = await fetch(`${apiOrigin.replace(/\/+$/, '')}/api/v1/apartments`);
  if (!res.ok) throw new Error(`Apartments for the sitemap: HTTP ${res.status}`);
  const body = (await res.json()) as { items: { number: number }[] };
  return body.items.map((a) => a.number).sort((x, y) => x - y);
}

function send(res: ServerResponse, type: string, body: string): void {
  res.setHeader('Content-Type', `${type}; charset=utf-8`);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.end(body);
}

/** Used by `ng serve`. */
export const reqHandler = createNodeRequestHandler(createRenderer());
