import type {
  Account,
  AccountInput,
  AdminBookingInput,
  Apartment,
  Booking,
  Channel,
  Message,
  Photo,
} from '@models/api.model';
import { addDays, isISO, nightsBetween, todayISO } from '@utils/dates.util';
import type { DemoSession } from './demo-auth';
import type { DemoRoute } from './demo-routes';
import { DemoFailure, type DemoStore, invalid, notFound, now } from './demo-store';

const MAX_ITEMS = 50;
const HORIZON_DAYS = 14;
const SEARCHED = ['name', 'email', 'phone', 'code'] as const;
/** Booking fields the editor sends as they are; e-mail options are ignored, the demo sends none. */
const EDITABLE = [
  'kind',
  'status',
  'apartment_ids',
  'check_in',
  'check_out',
  'guests',
  'name',
  'email',
  'phone',
  'note',
  'admin_note',
  'language',
] as const;

/** Endpoints under /admin, answered for whoever is signed in to the demo. */
export function adminRoutes(store: DemoStore, auth: DemoSession): DemoRoute[] {
  const { data } = store;
  const find = <T extends { id: number }>(items: T[], id: string): T => {
    const item = items.find((i) => i.id === Number(id));
    if (!item) throw notFound();
    return item;
  };
  const remove = <T extends { id: number }>(items: T[], id: string): null => {
    items.splice(items.indexOf(find(items, id)), 1);
    return null;
  };

  const routes: DemoRoute[] = [
    ['GET', /^\/admin\/dashboard$/, () => ({ today: todayISO(), dashboard: dashboard(store) })],
    ['GET', /^\/admin\/bookings$/, (req) => ({ items: listBookings(store, req.query) })],
    ['GET', /^\/admin\/bookings\/(\d+)$/, (_req, [id]) => store.booking(Number(id))],
    [
      'POST',
      /^\/admin\/bookings$/,
      (req) => saveBooking(store, null, req.body as AdminBookingInput),
    ],
    [
      'PATCH',
      /^\/admin\/bookings\/(\d+)$/,
      (req, [id]) => saveBooking(store, store.booking(Number(id)), req.body as AdminBookingInput),
    ],
    ['DELETE', /^\/admin\/bookings\/(\d+)$/, (_req, [id]) => remove(data.bookings, id)],

    [
      'GET',
      /^\/admin\/messages$/,
      (req) => {
        const status = req.query('status');
        const items = data.messages
          .filter((m) =>
            status === '' ? m.status !== 'archived' : status === 'all' || m.status === status,
          )
          .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
        return { items: items.slice(0, MAX_ITEMS) };
      },
    ],
    [
      'PATCH',
      /^\/admin\/messages\/(\d+)$/,
      (req, [id]) => Object.assign(find(data.messages, id), req.body as Pick<Message, 'status'>),
    ],
    ['DELETE', /^\/admin\/messages\/(\d+)$/, (_req, [id]) => remove(data.messages, id)],

    ['GET', /^\/admin\/apartments$/, () => ({ items: data.apartments })],
    [
      'PATCH',
      /^\/admin\/apartments\/(\d+)$/,
      (req, [id]) => {
        const { clear_price, ...changes } = req.body as Partial<Apartment> & {
          clear_price?: boolean;
        };
        const apartment = Object.assign(find(data.apartments, id), changes);
        if (clear_price) apartment.price_per_night = null;
        return apartment;
      },
    ],

    [
      'GET',
      /^\/admin\/photos$/,
      (req) => {
        const category = req.query('category');
        const apartment = Number(req.query('apartment')) || 0;
        const all = store.photos(
          (p) =>
            (!category || p.category === category) && (!apartment || p.apartment_id === apartment),
        );
        const offset = Math.max(Number(req.query('offset')) || 0, 0);
        return { items: all.slice(offset, offset + 200), total: all.length };
      },
    ],
    // Uploads need the server that resizes photos.
    [
      'POST',
      /^\/admin\/photos$/,
      () => {
        throw new DemoFailure(403, 'demo');
      },
    ],
    [
      'PATCH',
      /^\/admin\/photos\/(\d+)$/,
      (req, [id]) => {
        const photo = find(data.photos, id);
        const changes = req.body as Partial<Photo>;
        Object.assign(photo, changes);
        if (changes.category && changes.category !== 'apartment') photo.apartment_id = null;
        return photo;
      },
    ],
    ['DELETE', /^\/admin\/photos\/(\d+)$/, (_req, [id]) => remove(data.photos, id)],

    ['GET', /^\/admin\/users$/, () => ({ items: data.users })],
    [
      'POST',
      /^\/admin\/users$/,
      (req) => {
        const body = account(req.body as AccountInput);
        const user: Account = {
          id: store.nextId(data.users),
          role: 'staff',
          ...body,
          created_at: now(),
          last_login_at: null,
        };
        data.users.push(user);
        return user;
      },
    ],
    [
      'PATCH',
      /^\/admin\/users\/(\d+)$/,
      (req, [id]) => {
        const body = account(req.body as AccountInput);
        if (Number(id) === auth.require().id && body.role && body.role !== auth.require().role) {
          throw invalid({ role: 'own_account' });
        }
        return Object.assign(find(data.users, id), body);
      },
    ],
    [
      'DELETE',
      /^\/admin\/users\/(\d+)$/,
      (_req, [id]) => {
        if (Number(id) === auth.require().id) throw invalid({ id: 'own_account' });
        return remove(data.users, id);
      },
    ],

    ['GET', /^\/admin\/channels$/, () => ({ items: data.channels })],
    [
      'PUT',
      /^\/admin\/channels$/,
      (req) => {
        const body = req.body as Pick<Channel, 'apartment_id' | 'provider' | 'import_url'>;
        const at = data.channels.findIndex(
          (c) => c.apartment_id === body.apartment_id && c.provider === body.provider,
        );
        if (!body.import_url) {
          if (at >= 0) data.channels.splice(at, 1);
          return { channel: null };
        }
        const channel: Channel = {
          id: at >= 0 ? data.channels[at].id : store.nextId(data.channels),
          ...body,
          synced_at: now(),
          error: '',
          blocks: 0,
        };
        if (at >= 0) data.channels[at] = channel;
        else data.channels.push(channel);
        return { channel };
      },
    ],
    [
      'POST',
      /^\/admin\/channels\/(\d+)\/sync$/,
      (_req, [id]) => Object.assign(find(data.channels, id), { synced_at: now() }),
    ],
  ];
  // Every administration call needs a signed-in user, as with the real API.
  return routes.map(([method, path, answer]) => [
    method,
    path,
    (req, params) => (auth.require(), answer(req, params)),
  ]);
}

/** The fields of an account the demo keeps; passwords are not needed. */
function account({
  name,
  email,
  role,
}: AccountInput): Pick<Account, 'name' | 'email'> & Partial<Pick<Account, 'role'>> {
  return { name, email, ...(role && { role }) };
}

function listBookings(store: DemoStore, query: (name: string) => string): Booking[] {
  const [status, kind, from, to] = ['status', 'kind', 'from', 'to'].map(query);
  const term = query('q').trim().toLowerCase();
  return store.data.bookings
    .filter(
      (b) =>
        (!status || (status === 'active' ? b.status !== 'cancelled' : b.status === status)) &&
        (!kind || b.kind === kind) &&
        (!isISO(from) || b.check_out > from) &&
        (!isISO(to) || b.check_in < to) &&
        (!term || SEARCHED.some((column) => b[column].toLowerCase().includes(term))),
    )
    .sort((a, b) =>
      query('order') === 'created'
        ? b.created_at.localeCompare(a.created_at) || b.id - a.id
        : a.check_in.localeCompare(b.check_in) || a.id - b.id,
    )
    .slice(0, MAX_ITEMS);
}

function saveBooking(store: DemoStore, current: Booking | null, input: AdminBookingInput): Booking {
  const booking: Booking = current
    ? { ...current }
    : {
        id: store.nextId(store.data.bookings),
        code: store.bookingCode(),
        kind: 'guest',
        status: 'confirmed',
        source: 'admin',
        imported: false,
        check_in: '',
        check_out: '',
        nights: 0,
        guests: 0,
        name: '',
        email: '',
        phone: '',
        note: '',
        admin_note: '',
        total_price: null,
        language: 'cs',
        message_id: null,
        apartment_ids: [],
        created_at: now(),
        updated_at: now(),
      };
  const { total_price, clear_price, auto_price } = input;
  for (const key of EDITABLE) {
    if (input[key] !== undefined) Object.assign(booking, { [key]: input[key] });
  }

  const nights = nightsBetween(booking.check_in, booking.check_out);
  if (!isISO(booking.check_in) || !isISO(booking.check_out) || nights <= 0) {
    throw invalid({ check_out: 'invalid' });
  }
  if (booking.apartment_ids.length === 0) throw invalid({ apartment_ids: 'required' });
  if (booking.status !== 'cancelled') {
    const taken = store.taken(
      booking.apartment_ids,
      booking.check_in,
      booking.check_out,
      booking.id,
    );
    if (taken.length > 0) throw new DemoFailure(409, 'unavailable', { apartment_ids: taken });
  }

  booking.nights = nights;
  if (total_price != null) booking.total_price = total_price;
  if (clear_price) booking.total_price = null;
  const automatic = current ? auto_price : auto_price || (total_price == null && !clear_price);
  if (automatic)
    booking.total_price = store.price(booking.apartment_ids, booking.check_in, booking.check_out);
  booking.updated_at = now();

  if (current) Object.assign(current, booking);
  else store.data.bookings.push(booking);
  if (input.message_id) {
    const message = store.data.messages.find((m) => m.id === input.message_id);
    if (message) message.booking_id = booking.id;
  }
  return current ?? booking;
}

function dashboard(store: DemoStore) {
  const { bookings, messages, apartments } = store.data;
  const day = todayISO();
  const horizon = addDays(day, HORIZON_DAYS);
  const staying = bookings.filter(
    (b) => b.status === 'confirmed' && b.check_in <= day && b.check_out > day,
  );
  const guests = bookings.filter((b) => b.status === 'confirmed' && b.kind === 'guest');
  const between = (date: string) => date >= day && date <= horizon;
  return {
    pending_bookings: bookings.filter((b) => b.status === 'pending').length,
    new_messages: messages.filter((m) => m.status === 'new').length,
    occupied_tonight: new Set(staying.flatMap((b) => b.apartment_ids)).size,
    apartments: apartments.filter((a) => a.active).length,
    guests_in_house: staying
      .filter((b) => b.kind === 'guest')
      .reduce((sum, b) => sum + b.guests, 0),
    arrivals: guests
      .filter((b) => between(b.check_in))
      .sort((a, b) => a.check_in.localeCompare(b.check_in) || a.id - b.id),
    departures: guests
      .filter((b) => between(b.check_out))
      .sort((a, b) => a.check_out.localeCompare(b.check_out) || a.id - b.id),
    pending: bookings
      .filter((b) => b.status === 'pending')
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id),
  };
}
