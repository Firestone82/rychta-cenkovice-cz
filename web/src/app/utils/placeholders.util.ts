import type { Account, Apartment, Booking, Dashboard, Message, Photo } from '@models/api.model';

/*
 * Stand-ins for data that is still loading. `rc-admin-skeleton` draws the components filled
 * with them as grey shapes, so nobody reads these values: only how much room they take matters.
 */

const FROM = '2000-01-01';
const TO = '2000-01-04';
const MOMENT = '2000-01-01T12:00:00.000Z';
const NO_TEXT = { cs: '', en: '' };

function many<T>(count: number, make: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => make(index));
}

/** Two apartments on each floor from the top one down, the order the lists use. */
export function placeholderApartments(count = 6): Apartment[] {
  return many(count, (index) => ({
    id: -1 - index,
    slug: '',
    number: index + 1,
    name: NO_TEXT,
    floor: Math.max(1, 3 - Math.floor(index / 2)),
    area: 50,
    beds: 4,
    extra_beds: 0,
    accessible: false,
    flat_type: '2+1',
    amenities: [],
    labels: [],
    layout: NO_TEXT,
    features: { cs: [], en: [] },
    note: NO_TEXT,
    description: NO_TEXT,
    price_per_night: 1000,
    min_nights: 1,
    active: true,
    cover: null,
  }));
}

export function placeholderBookings(count: number): Booking[] {
  return many(count, (index) => ({
    id: -1 - index,
    code: 'RC-000000',
    kind: 'guest',
    status: 'confirmed',
    source: 'admin',
    imported: false,
    check_in: FROM,
    check_out: TO,
    nights: 3,
    guests: 2,
    name: 'Guest of the house',
    email: 'guest@example.com',
    phone: '',
    note: '',
    admin_note: '',
    total_price: null,
    language: 'cs',
    message_id: null,
    apartment_ids: [1],
    created_at: MOMENT,
    updated_at: MOMENT,
  }));
}

export function placeholderDashboard(): Dashboard {
  return {
    pending_bookings: 0,
    new_messages: 0,
    occupied_tonight: 0,
    apartments: 0,
    guests_in_house: 0,
    arrivals: placeholderBookings(3),
    departures: placeholderBookings(3),
    pending: placeholderBookings(1),
  };
}

export function placeholderMessages(count: number): Message[] {
  return many(count, (index) => ({
    id: -1 - index,
    name: 'Guest of the house',
    email: 'guest@example.com',
    phone: '',
    body: 'A message from the contact form, about as long as one line of text usually is.',
    language: 'cs',
    status: 'read',
    created_at: MOMENT,
    booking_id: null,
  }));
}

export function placeholderAccounts(count: number): Account[] {
  return many(count, (index) => ({
    id: -1 - index,
    email: 'account@example.com',
    name: 'Name of the account',
    role: 'staff',
    created_at: MOMENT,
    last_login_at: MOMENT,
  }));
}

/** Photos without a file: `ApiService.photoUrl` gives them an empty picture. */
export function placeholderPhotos(count: number, category = ''): Photo[] {
  return many(count, (index) => ({
    id: -1 - index,
    category,
    apartment_id: null,
    file: '',
    width: 4,
    height: 3,
    widths: [],
    color: '',
    placeholder: '',
    alt: { cs: 'Description of the photo', en: 'Description of the photo' },
    sort: index,
  }));
}
