import type { Apartment, Booking, BookingRequest, ContactRequest, Photo } from '@models/api.model';
import { isISO, nightsBetween } from '@utils/dates.util';
import type { DemoRoute } from './demo-routes';
import { DemoFailure, type DemoStore, invalid, notFound, now } from './demo-store';

const PAGE = 24;
const MAX_PAGE = 60;

/** Endpoints the website uses without signing in. */
export function publicRoutes(store: DemoStore): DemoRoute[] {
  const { data } = store;
  const active = () => data.apartments.filter((a) => a.active);
  const withoutPhotos = (a: Apartment): Apartment => ({ ...a, photos: undefined });

  return [
    ['GET', /^\/config$/, () => ({ hcaptcha_sitekey: '' })],
    ['GET', /^\/apartments$/, () => ({ items: active().map(withoutPhotos) })],
    [
      'GET',
      /^\/apartments\/([^/]+)$/,
      (_req, [slug]) => {
        const apartment = active().find((a) => a.slug === decodeURIComponent(slug));
        if (!apartment) throw notFound();
        return { ...apartment, photos: store.photos((p) => p.apartment_id === apartment.id) };
      },
    ],
    [
      'GET',
      /^\/availability$/,
      (req) => {
        const from = req.query('from');
        const to = req.query('to');
        const ranges = store
          .holding(from, to)
          .sort((a, b) => a.check_in.localeCompare(b.check_in))
          .flatMap((b) =>
            b.apartment_ids.map((id) => ({
              apartment_id: id,
              from: b.check_in,
              to: b.check_out,
              status: b.status === 'pending' ? 'pending' : 'booked',
            })),
          )
          .sort((a, b) => a.apartment_id - b.apartment_id);
        return { from, to, ranges };
      },
    ],
    [
      'GET',
      /^\/availability\/check$/,
      (req) => {
        const [checkIn, checkOut] = [req.query('check_in'), req.query('check_out')];
        const ids = data.apartments.map((a) => a.id);
        return {
          check_in: checkIn,
          check_out: checkOut,
          nights: nightsBetween(checkIn, checkOut),
          unavailable_ids: store.taken(ids, checkIn, checkOut),
        };
      },
    ],
    ['POST', /^\/bookings$/, (req) => requestBooking(store, req.body as BookingRequest)],
    [
      'POST',
      /^\/contact$/,
      (req) => {
        const body = req.body as ContactRequest;
        data.messages.unshift({
          id: store.nextId(data.messages),
          name: body.name,
          email: body.email,
          phone: body.phone,
          body: body.message,
          language: body.language === 'en' ? 'en' : 'cs',
          status: 'new',
          created_at: now(),
          booking_id: null,
        });
        return null;
      },
    ],
    [
      'GET',
      /^\/photos$/,
      (req) => {
        const category = req.query('category');
        const apartment = Number(req.query('apartment')) || 0;
        const offset = Math.max(Number(req.query('offset')) || 0, 0);
        const asked = Number(req.query('limit')) || 0;
        const limit = asked > 0 && asked <= MAX_PAGE ? asked : PAGE;
        const all = store.photos(
          (p) =>
            (category ? p.category === category : p.category !== 'misc') &&
            (!apartment || p.apartment_id === apartment),
        );
        const items = all.slice(offset, offset + limit);
        const end = offset + items.length;
        return {
          items,
          total: all.length,
          next_offset: end < all.length ? end : null,
          ...(offset === 0 && {
            categories: categories(store.photos((p) => p.category !== 'misc')),
          }),
        };
      },
    ],
    [
      'GET',
      /^\/photos\/covers$/,
      () => {
        const covers: Record<string, Photo> = {};
        for (const photo of store.photos((p) => p.category !== 'apartment')) {
          covers[photo.category] ??= photo;
        }
        return { covers };
      },
    ],
  ];
}

function categories(photos: Photo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const photo of photos) counts[photo.category] = (counts[photo.category] ?? 0) + 1;
  return counts;
}

/** Same checks the API makes for the dates and the free apartments; the request is kept as pending. */
function requestBooking(store: DemoStore, body: BookingRequest) {
  const { check_in: checkIn, check_out: checkOut } = body;
  if (!isISO(checkIn) || !isISO(checkOut) || nightsBetween(checkIn, checkOut) <= 0) {
    throw invalid({ check_out: 'invalid' });
  }
  const taken = store.taken(body.apartment_ids, checkIn, checkOut);
  if (taken.length > 0) throw new DemoFailure(409, 'unavailable', { apartment_ids: taken });

  const booking: Booking = {
    id: store.nextId(store.data.bookings),
    code: store.bookingCode(),
    kind: 'guest',
    status: 'pending',
    source: 'web',
    imported: false,
    check_in: checkIn,
    check_out: checkOut,
    nights: nightsBetween(checkIn, checkOut),
    guests: body.guests,
    name: body.name,
    email: body.email,
    phone: body.phone,
    note: body.note,
    admin_note: '',
    total_price: store.price(body.apartment_ids, checkIn, checkOut),
    language: body.language === 'en' ? 'en' : 'cs',
    message_id: null,
    apartment_ids: [...new Set(body.apartment_ids)],
    created_at: now(),
    updated_at: now(),
  };
  store.data.bookings.push(booking);
  const { code, status, nights, total_price } = booking;
  return { code, status, check_in: checkIn, check_out: checkOut, nights, total_price };
}
