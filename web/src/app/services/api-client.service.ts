import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE } from '@config/api.config';
import { firstValueFrom } from 'rxjs';

const CACHE_MS = 60_000;

/** Promise-based HTTP access to the API, shared by the public and the admin API services. */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE);
  private readonly memo = new Map<string, { at: number; value: Promise<unknown> }>();

  /** Undefined and empty parameters are left out of the query. */
  get<T>(path: string, params?: object): Promise<T> {
    let query = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== '') query = query.set(k, String(v));
    }
    return firstValueFrom(this.http.get<T>(this.base + path, { params: query }));
  }

  send<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.request<T>(method, this.base + path, { body }));
  }

  /** Short-lived cache for lists that several pages ask for; failures are not kept. */
  cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.memo.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as Promise<T>;
    const value = load();
    this.memo.set(key, { at: Date.now(), value });
    value.catch(() => this.memo.delete(key));
    return value;
  }

  /** Drops the cache now and again when `result` settles; for calls that change cached lists. */
  invalidating<T>(result: Promise<T>): Promise<T> {
    this.memo.clear();
    return result.finally(() => this.memo.clear());
  }
}
