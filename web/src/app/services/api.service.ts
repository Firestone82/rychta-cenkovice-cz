import { Injectable, inject } from '@angular/core';
import { MEDIA_BASE } from '@config/api.config';
import type {
  Apartment,
  BookingReceipt,
  BookingRequest,
  ContactRequest,
  OccupiedRange,
  Photo,
  PhotoPage,
  SiteConfig,
} from '@models/api.model';
import { ApiClient } from './api-client.service';

/** A transparent pixel, so a placeholder photo requests nothing. */
const EMPTY_PICTURE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/** Public endpoints of the API: what the website needs without signing in. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly client = inject(ApiClient);
  private readonly media = inject(MEDIA_BASE);

  /** URL of one generated size of a photo; a photo without a file is an empty picture. */
  photoUrl(photo: Pick<Photo, 'file'>, width: number): string {
    return photo.file ? `${this.media}/${photo.file}-${width}.jpg` : EMPTY_PICTURE;
  }

  srcset(photo: Pick<Photo, 'file' | 'widths'>): string {
    return photo.widths.map((w) => `${this.photoUrl(photo, w)} ${w}w`).join(', ');
  }

  /** Settings the website needs from the API: the hCaptcha site key ('' when switched off). */
  config(): Promise<SiteConfig> {
    return this.client.cached('config', () => this.client.get<SiteConfig>('/config'));
  }
  apartments(): Promise<Apartment[]> {
    return this.client.cached('apartments', () =>
      this.client.get<{ items: Apartment[] }>('/apartments').then((r) => r.items),
    );
  }
  apartment(slug: string): Promise<Apartment> {
    return this.client.get<Apartment>(`/apartments/${encodeURIComponent(slug)}`);
  }
  occupancy(from: string, to: string): Promise<OccupiedRange[]> {
    return this.client
      .get<{ ranges: OccupiedRange[] }>('/availability', { from, to })
      .then((r) => r.ranges);
  }
  checkAvailability(checkIn: string, checkOut: string): Promise<number[]> {
    return this.client
      .get<{ unavailable_ids: number[] }>('/availability/check', {
        check_in: checkIn,
        check_out: checkOut,
      })
      .then((r) => r.unavailable_ids);
  }
  requestBooking(body: BookingRequest): Promise<BookingReceipt> {
    return this.client.send<BookingReceipt>('POST', '/bookings', body);
  }
  contact(body: ContactRequest): Promise<void> {
    return this.client.send<void>('POST', '/contact', body);
  }
  photos(params: {
    category?: string;
    apartment?: number;
    offset?: number;
    limit?: number;
  }): Promise<PhotoPage> {
    return this.client.get<PhotoPage>('/photos', params);
  }
  photoCovers(): Promise<Record<string, Photo>> {
    return this.client.cached('covers', () =>
      this.client.get<{ covers: Record<string, Photo> }>('/photos/covers').then((r) => r.covers),
    );
  }
}
