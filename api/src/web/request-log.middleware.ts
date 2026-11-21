import { Logger } from '@nestjs/common';
import type { RequestHandler } from 'express';

/** One line per API request: method, path, status, duration and caller. */
export function requestLog(): RequestHandler {
  const logger = new Logger('Http');
  return (req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    const started = performance.now();
    // Routing rewrites the request's path, so it is read now.
    const path = req.path;
    res.on('finish', () => {
      const ms = Math.round(performance.now() - started);
      logger.log(`${req.method} ${path} ${res.statusCode} ${ms}ms ${req.ip ?? ''}`);
    });
    next();
  };
}
