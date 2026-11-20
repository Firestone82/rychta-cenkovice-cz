import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE, MEDIA_BASE } from './config';
import type {
  ApiErrorBody,
  Apartment,
  Booking,
  Dashboard,
  Message,
  NewsItem,
  OccupiedRange,
  Photo,
} from './models';

export interface BookingRequest {
  apartment_ids: number[];
  check_in: string;
  check_out: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  consent: boolean;
  language: string;
  website: string;
  captcha_token?: string;
}

export interface SiteConfig {
  hcaptcha_sitekey: string;
}

export interface BookingReceipt {
  code: string;
  status: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_price: number | null;
}

export interface PhotoPage {
  items: Photo[];
  total: number;
  next_offset: number | null;
  categories?: Record<string, number>;
}

export type AdminBookingInput = Partial<
  Pick<
    Booking,
    | 'kind'
    | 'status'
    | 'apartment_ids'
    | 'check_in'
    | 'check_out'
    | 'guests'
    | 'name'
    | 'email'
    | 'phone'
    | 'note'
    | 'admin_note'
    | 'language'
  >
> & {
  total_price?: number;
  clear_price?: boolean;
  auto_price?: boolean;
  message_id?: number;
  notify?: boolean;
  guest_message?: string;
};

/** What went wrong with an API call, in a form the UI can act on. */
export interface ApiFailure {
  status: number;
  code: string;
  fields: Record<string, string>;
  apartmentIds: number[];
  retryAfter: number;
}

export function toFailure(err: unknown): ApiFailure {
  if (err instanceof HttpErrorResponse) {
    const body = (err.error ?? {}) as ApiErrorBody;
    return {
      status: err.status,
      code: body.error?.code ?? (err.status === 0 ? 'offline' : 'internal'),
      fields: body.error?.fields ?? {},
      apartmentIds: body.apartment_ids ?? [],
      retryAfter: body.retry_after ?? 0,
    };
  }
  return { status: 0, code: 'internal', fields: {}, apartmentIds: [], retryAfter: 0 };
}

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE);
  private readonly media = inject(MEDIA_BASE);

  private get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== '') p = p.set(k, String(v));
    }
    return firstValueFrom(this.http.get<T>(this.base + path, { params: p }));
  }

  private send<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
    return firstValueFrom(this.http.request<T>(method, this.base + path, { body }));
  }

  /** URL of one generated size of a photo. */
  photoUrl(photo: Pick<Photo, 'file'>, width: number): string {
    return `${this.media}/${photo.file}-${width}.jpg`;
  }

  srcset(photo: Pick<Photo, 'file' | 'widths'>): string {
    return photo.widths.map((w) => `${this.photoUrl(photo, w)} ${w}w`).join(', ');
  }

  /** Short-lived cache for lists that several pages ask for (apartments, cover photos). */
  private readonly memo = new Map<string, { at: number; value: Promise<unknown> }>();

  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.memo.get(key);
    if (hit && Date.now() - hit.at < 60_000) return hit.value as Promise<T>;
    const value = load();
    this.memo.set(key, { at: Date.now(), value });
    value.catch(() => this.memo.delete(key));
    return value;
  }

  /** Forgets cached lists after the administration changed something. */
  private changed<T>(result: Promise<T>): Promise<T> {
    this.memo.clear();
    return result.finally(() => this.memo.clear());
  }

  // ----- public -----
  /** Settings the website needs from the API: the hCaptcha site key ('' when switched off). */
  config(): Promise<SiteConfig> {
    return this.cached('config', () => this.get<SiteConfig>('/config'));
  }
  apartments(): Promise<Apartment[]> {
    return this.cached('apartments', () =>
      this.get<{ items: Apartment[] }>('/apartments').then((r) => r.items),
    );
  }
  apartment(slug: string): Promise<Apartment> {
    return this.get<Apartment>(`/apartments/${encodeURIComponent(slug)}`);
  }
  occupancy(from: string, to: string): Promise<OccupiedRange[]> {
    return this.get<{ ranges: OccupiedRange[] }>('/availability', { from, to }).then(
      (r) => r.ranges,
    );
  }
  checkAvailability(checkIn: string, checkOut: string): Promise<number[]> {
    return this.get<{ unavailable_ids: number[] }>('/availability/check', {
      check_in: checkIn,
      check_out: checkOut,
    }).then((r) => r.unavailable_ids);
  }
  requestBooking(body: BookingRequest): Promise<BookingReceipt> {
    return this.send<BookingReceipt>('POST', '/bookings', body);
  }
  contact(body: {
    name: string;
    email: string;
    phone: string;
    message: string;
    consent: boolean;
    language: string;
    website: string;
    captcha_token?: string;
  }): Promise<void> {
    return this.send<void>('POST', '/contact', body);
  }
  photos(params: {
    category?: string;
    apartment?: number;
    offset?: number;
    limit?: number;
  }): Promise<PhotoPage> {
    return this.get<PhotoPage>('/photos', params);
  }
  photoCovers(): Promise<Record<string, Photo>> {
    return this.cached('covers', () =>
      this.get<{ covers: Record<string, Photo> }>('/photos/covers').then((r) => r.covers),
    );
  }
  news(): Promise<NewsItem[]> {
    return this.get<{ items: NewsItem[] }>('/news').then((r) => r.items);
  }

  // ----- administration -----
  dashboard(): Promise<{ today: string; dashboard: Dashboard }> {
    return this.get('/admin/dashboard');
  }
  adminBookings(params: {
    status?: string;
    kind?: string;
    from?: string;
    to?: string;
    q?: string;
    order?: string;
  }): Promise<Booking[]> {
    return this.get<{ items: Booking[] }>('/admin/bookings', params).then((r) => r.items);
  }
  adminBooking(id: number): Promise<Booking> {
    return this.get<Booking>(`/admin/bookings/${id}`);
  }
  createBooking(body: AdminBookingInput): Promise<Booking> {
    return this.send<Booking>('POST', '/admin/bookings', body);
  }
  updateBooking(id: number, body: AdminBookingInput): Promise<Booking> {
    return this.send<Booking>('PATCH', `/admin/bookings/${id}`, body);
  }
  deleteBooking(id: number): Promise<void> {
    return this.send<void>('DELETE', `/admin/bookings/${id}`);
  }
  messages(status?: string): Promise<Message[]> {
    return this.get<{ items: Message[] }>('/admin/messages', { status }).then((r) => r.items);
  }
  setMessageStatus(id: number, status: Message['status']): Promise<Message> {
    return this.send<Message>('PATCH', `/admin/messages/${id}`, { status });
  }
  deleteMessage(id: number): Promise<void> {
    return this.send<void>('DELETE', `/admin/messages/${id}`);
  }
  adminApartments(): Promise<Apartment[]> {
    return this.get<{ items: Apartment[] }>('/admin/apartments').then((r) => r.items);
  }
  updateApartment(id: number, body: Record<string, unknown>): Promise<Apartment> {
    return this.changed(this.send<Apartment>('PATCH', `/admin/apartments/${id}`, body));
  }
  adminPhotos(params: {
    category?: string;
    apartment?: number;
    offset?: number;
  }): Promise<{ items: Photo[]; total: number }> {
    return this.get('/admin/photos', params);
  }
  uploadPhoto(file: File, category: string, apartmentId: number | null): Promise<Photo> {
    const form = new FormData();
    form.set('file', file);
    form.set('category', category);
    if (apartmentId) form.set('apartment_id', String(apartmentId));
    return this.changed(this.send<Photo>('POST', '/admin/photos', form));
  }
  updatePhoto(
    id: number,
    body: {
      alt?: { cs: string; en: string };
      category?: string;
      apartment_id?: number;
      sort?: number;
    },
  ): Promise<Photo> {
    return this.changed(this.send<Photo>('PATCH', `/admin/photos/${id}`, body));
  }
  deletePhoto(id: number): Promise<void> {
    return this.changed(this.send<void>('DELETE', `/admin/photos/${id}`));
  }
  adminNews(): Promise<NewsItem[]> {
    return this.get<{ items: NewsItem[] }>('/admin/news').then((r) => r.items);
  }
  saveNews(item: Omit<NewsItem, 'id'> & { id?: number }): Promise<NewsItem> {
    return item.id
      ? this.send<NewsItem>('PATCH', `/admin/news/${item.id}`, item)
      : this.send<NewsItem>('POST', '/admin/news', item);
  }
  deleteNews(id: number): Promise<void> {
    return this.send<void>('DELETE', `/admin/news/${id}`);
  }
}
