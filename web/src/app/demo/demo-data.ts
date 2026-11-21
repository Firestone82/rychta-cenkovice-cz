import type { Account, Apartment, Booking, Channel, Message, Photo } from '@models/api.model';
import { addDays, nightsBetween, todayISO } from '@utils/dates.util';

/** What tools/make-demo-snapshot.mjs captured from a real API. */
export interface DemoData {
  /** Day of the capture; bookings and messages are moved by the days passed since. */
  date: string;
  apartments: Apartment[];
  photos: Photo[];
  bookings: Booking[];
  messages: Message[];
  users: Account[];
  channels: Channel[];
}

/** Loads the snapshot next to the page (relative to <base href>) and brings its dates to today. */
export async function loadDemoData(): Promise<DemoData> {
  const response = await fetch('demo/data.json');
  if (!response.ok) throw new Error(`demo data: HTTP ${response.status}`);
  const data = (await response.json()) as DemoData;
  const shift = nightsBetween(data.date, todayISO());
  const moved = (stamp: string) => new Date(Date.parse(stamp) + shift * 86_400_000).toISOString();
  for (const booking of data.bookings) {
    booking.check_in = addDays(booking.check_in, shift);
    booking.check_out = addDays(booking.check_out, shift);
    booking.created_at = moved(booking.created_at);
    booking.updated_at = moved(booking.updated_at);
  }
  for (const message of data.messages) message.created_at = moved(message.created_at);
  data.date = todayISO();
  return data;
}
