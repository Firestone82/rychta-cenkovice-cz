import { Injectable, inject } from '@angular/core';
import type {
  AdminBookingInput,
  Apartment,
  Booking,
  Dashboard,
  Message,
  Photo,
} from '@models/api.model';
import { ApiClient } from './api-client.service';

/** Endpoints under `/admin`; the auth interceptor adds the access token to them. */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly client = inject(ApiClient);

  dashboard(): Promise<{ today: string; dashboard: Dashboard }> {
    return this.client.get('/admin/dashboard');
  }
  bookings(params: {
    status?: string;
    kind?: string;
    from?: string;
    to?: string;
    q?: string;
    order?: string;
  }): Promise<Booking[]> {
    return this.client.get<{ items: Booking[] }>('/admin/bookings', params).then((r) => r.items);
  }
  booking(id: number): Promise<Booking> {
    return this.client.get<Booking>(`/admin/bookings/${id}`);
  }
  createBooking(body: AdminBookingInput): Promise<Booking> {
    return this.client.send<Booking>('POST', '/admin/bookings', body);
  }
  updateBooking(id: number, body: AdminBookingInput): Promise<Booking> {
    return this.client.send<Booking>('PATCH', `/admin/bookings/${id}`, body);
  }
  deleteBooking(id: number): Promise<void> {
    return this.client.send<void>('DELETE', `/admin/bookings/${id}`);
  }
  messages(status?: string): Promise<Message[]> {
    return this.client
      .get<{ items: Message[] }>('/admin/messages', { status })
      .then((r) => r.items);
  }
  setMessageStatus(id: number, status: Message['status']): Promise<Message> {
    return this.client.send<Message>('PATCH', `/admin/messages/${id}`, { status });
  }
  deleteMessage(id: number): Promise<void> {
    return this.client.send<void>('DELETE', `/admin/messages/${id}`);
  }
  apartments(): Promise<Apartment[]> {
    return this.client.get<{ items: Apartment[] }>('/admin/apartments').then((r) => r.items);
  }
  updateApartment(id: number, body: Record<string, unknown>): Promise<Apartment> {
    return this.client.invalidating(
      this.client.send<Apartment>('PATCH', `/admin/apartments/${id}`, body),
    );
  }
  photos(params: {
    category?: string;
    apartment?: number;
    offset?: number;
  }): Promise<{ items: Photo[]; total: number }> {
    return this.client.get('/admin/photos', params);
  }
  uploadPhoto(file: File, category: string, apartmentId: number | null): Promise<Photo> {
    const form = new FormData();
    form.set('file', file);
    form.set('category', category);
    if (apartmentId) form.set('apartment_id', String(apartmentId));
    return this.client.invalidating(this.client.send<Photo>('POST', '/admin/photos', form));
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
    return this.client.invalidating(this.client.send<Photo>('PATCH', `/admin/photos/${id}`, body));
  }
  deletePhoto(id: number): Promise<void> {
    return this.client.invalidating(this.client.send<void>('DELETE', `/admin/photos/${id}`));
  }
}
