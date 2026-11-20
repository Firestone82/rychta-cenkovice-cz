export interface L10n {
  cs: string;
  en: string;
}

export interface L10nList {
  cs: string[];
  en: string[];
}

export interface Photo {
  id: number;
  category: string;
  apartment_id: number | null;
  file: string;
  width: number;
  height: number;
  widths: number[];
  color: string;
  placeholder: string;
  alt: L10n;
  sort: number;
}

export interface Apartment {
  id: number;
  slug: string;
  number: number;
  floor: number;
  area: number;
  beds: number;
  extra_beds: number;
  accessible: boolean;
  type: L10n;
  layout: L10n;
  features: L10nList;
  note: L10n;
  description: L10n;
  price_per_night: number | null;
  min_nights: number;
  active: boolean;
  cover: Photo | null;
  photos?: Photo[];
}

export interface OccupiedRange {
  apartment_id: number;
  from: string;
  to: string;
  status: 'booked' | 'pending';
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type BookingKind = 'guest' | 'block';

export interface Booking {
  id: number;
  code: string;
  kind: BookingKind;
  status: BookingStatus;
  source: 'web' | 'admin';
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  admin_note: string;
  total_price: number | null;
  language: 'cs' | 'en';
  message_id: number | null;
  apartment_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  name: string;
  email: string;
  phone: string;
  body: string;
  language: 'cs' | 'en';
  status: 'new' | 'read' | 'archived';
  created_at: string;
  booking_id: number | null;
}

export interface NewsItem {
  id: number;
  title: L10n;
  body: L10n;
  published: boolean;
  published_at: string;
}

export interface Dashboard {
  pending_bookings: number;
  new_messages: number;
  occupied_tonight: number;
  apartments: number;
  guests_in_house: number;
  arrivals: Booking[];
  departures: Booking[];
  pending: Booking[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/** Error body of the API: { error: { code, message, fields? } } */
export interface ApiErrorBody {
  error?: { code: string; message: string; fields?: Record<string, string> };
  apartment_ids?: number[];
  retry_after?: number;
}
