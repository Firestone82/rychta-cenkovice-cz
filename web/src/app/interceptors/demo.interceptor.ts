import type { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE } from '@config/api.config';
import type { DemoBackend } from '../demo/demo-routes';
import { from } from 'rxjs';

/** Pause before each answer, so loading states show as they would against a server. */
const LATENCY_MS = 180;

let backend: Promise<DemoBackend> | null = null;

/** In the showcase build, answers API calls in the browser instead of sending them. */
export const demoInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE);
  if (!req.url.startsWith(base)) return next(req);
  backend ??= import('../demo/demo-routes').then((m) => m.DemoBackend.create());
  return from(respond(req, req.url.slice(base.length)));
};

async function respond(req: HttpRequest<unknown>, path: string): Promise<HttpResponse<unknown>> {
  const api = await backend!;
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  try {
    const body = api.answer({
      method: req.method,
      path,
      query: (name) => req.params.get(name) ?? '',
      body: req.body,
    });
    return new HttpResponse({ status: body === null ? 204 : 200, body, url: req.url });
  } catch (err) {
    const failure = err as { status?: number; body?: unknown };
    if (!failure.status) throw err;
    throw new HttpErrorResponse({ status: failure.status, error: failure.body, url: req.url });
  }
}
