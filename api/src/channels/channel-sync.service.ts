import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { Apartment } from '../apartments/apartment.entity.js';
import { newBookingCode } from '../bookings/booking-code.js';
import { BookingUnit } from '../bookings/booking-unit.entity.js';
import { Booking } from '../bookings/booking.entity.js';
import { addYears, today } from '../common/dates.util.js';
import { ChannelConnection, type ChannelProvider } from './channel-connection.entity.js';
import { ChannelFeedService, FeedFailure } from './channel-feed.service.js';
import { type DayRange, mergeRanges, subtractRanges } from './day-ranges.util.js';
import { type CalendarEvent, parseCalendar } from './ical.util.js';

/** The name an imported block carries in the calendar. */
const PROVIDER_NAMES: Record<ChannelProvider, string> = {
  echalupy: 'e-chalupy.cz',
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  other: 'iCal',
};

const HORIZON_YEARS = 3;
const key = (range: DayRange): string => `${range.from}/${range.to}`;

/**
 * Keeps the days taken on a portal blocked here. A feed carries dates only, so every stay there
 * becomes a block of its apartment.
 */
@Injectable()
export class ChannelSyncService {
  private readonly logger = new Logger(ChannelSyncService.name);
  /** The running or queued sync of each connection, so two never write at once. */
  private readonly queue = new Map<number, Promise<void>>();

  constructor(
    @InjectRepository(ChannelConnection)
    private readonly connections: Repository<ChannelConnection>,
    private readonly feeds: ChannelFeedService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('*/15 * * * *')
  async syncAll(): Promise<void> {
    const connections = await this.connections.find({ select: { id: true } });
    await Promise.all(connections.map(({ id }) => this.sync(id)));
  }

  /** Reads the feed and writes the outcome to the connection. Never throws. */
  sync(id: number): Promise<void> {
    const run = (this.queue.get(id) ?? Promise.resolve())
      .then(() => this.run(id))
      .catch((error: unknown) => {
        this.logger.error(`Calendar ${id} could not be synchronised: ${String(error)}`);
      })
      .finally(() => {
        if (this.queue.get(id) === run) this.queue.delete(id);
      });
    this.queue.set(id, run);
    return run;
  }

  /**
   * Synchronises the calendars of the given apartments in the background. Called after a booking
   * made here changed, because imported blocks give way to it and grow back when it is gone.
   */
  refresh(apartmentIds: number[]): void {
    if (apartmentIds.length === 0) return;
    this.connections
      .find({ select: { id: true }, where: { apartmentId: In(apartmentIds) } })
      .then((connections) => connections.forEach(({ id }) => void this.sync(id)))
      .catch((error: unknown) => {
        this.logger.error(`Calendars could not be refreshed: ${String(error)}`);
      });
  }

  private async run(id: number): Promise<void> {
    const connection = await this.connections.findOneBy({ id });
    if (!connection) return;
    let lastError = '';
    try {
      const events = parseCalendar(await this.feeds.fetch(connection.importUrl));
      if (!events) throw new FeedFailure('not_calendar');
      await this.apply(connection, events);
    } catch (error) {
      if (!(error instanceof FeedFailure)) throw error;
      lastError = error.code;
    }
    await this.connections.update(id, { syncedAt: new Date(), lastError });
  }

  /**
   * Makes the upcoming blocks of the connection equal the feed. Days already held by a booking
   * made here are left out, so a stay copied to the portal by hand does not come back twice.
   */
  private async apply(connection: ChannelConnection, events: CalendarEvent[]): Promise<void> {
    const { id, apartmentId, provider } = connection;
    const now = today();
    const horizon = addYears(now, HORIZON_YEARS);
    const taken = mergeRanges(
      events
        .filter((event) => event.end > now && event.start < horizon)
        .map((event) => ({ from: event.start, to: event.end })),
    );

    await this.dataSource.transaction(async (manager) => {
      // The same lock as for a new booking, so neither sees the other half-written.
      await manager.find(Apartment, {
        select: { id: true },
        where: { id: apartmentId },
        lock: { mode: 'pessimistic_write' },
      });
      const local = await manager.find(BookingUnit, {
        where: {
          apartmentId,
          booking: {
            status: In(['pending', 'confirmed']),
            channelConnectionId: IsNull(),
            checkOut: MoreThan(now),
            checkIn: LessThan(horizon),
          },
        },
        relations: { booking: true },
      });
      const wanted = new Map(
        subtractRanges(
          taken,
          local.map(({ booking }) => ({ from: booking.checkIn, to: booking.checkOut })),
        ).map((range) => [key(range), range]),
      );

      const blocks = await manager.find(Booking, {
        select: { id: true, checkIn: true, checkOut: true },
        where: { channelConnectionId: id, checkOut: MoreThan(now) },
      });
      // A block that is still wanted stays; what then remains in `wanted` is new.
      const gone = blocks.filter(
        (block) => !wanted.delete(key({ from: block.checkIn, to: block.checkOut })),
      );
      if (gone.length > 0) await manager.delete(Booking, { id: In(gone.map((block) => block.id)) });

      for (const range of wanted.values()) {
        // A code that is already taken fails this round; the next one draws a new code.
        const { identifiers } = await manager.insert(Booking, {
          code: newBookingCode(),
          kind: 'block',
          status: 'confirmed',
          source: provider,
          checkIn: range.from,
          checkOut: range.to,
          name: PROVIDER_NAMES[provider],
          channelConnectionId: id,
        });
        await manager.insert(BookingUnit, { bookingId: identifiers[0].id as number, apartmentId });
      }
    });
  }
}
