import type { Amenity, FlatType } from './apartment-options.model';
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
  flat_type: FlatType | '';
  amenities: Amenity[];
  labels: L10n[];
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

export interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
  language: string;
  /** Honeypot: must stay empty. */
  website: string;
  captcha_token?: string;
}

/** What went wrong with an API call, in a form the UI can act on. */
export interface ApiFailure {
  status: number;
  code: string;
  fields: Record<string, string>;
  apartmentIds: number[];
  retryAfter: number;
}
