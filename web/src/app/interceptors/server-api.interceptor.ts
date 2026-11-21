import type { HttpInterceptorFn } from '@angular/common/http';
import { renderContext } from '@config/render.config';

/** On the server, API calls go straight to the API process instead of out through the public address. */
export const serverApiInterceptor: HttpInterceptorFn = (req, next) => {
  const origin = renderContext().apiOrigin;
  if (!origin || !req.url.startsWith('/')) return next(req);
  return next(req.clone({ url: origin.replace(/\/+$/, '') + req.url }));
};
