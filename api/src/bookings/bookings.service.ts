import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  type EntityManager,
  type FindOptionsWhere,
  ILike,
  In,
  LessThan,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { Apartment } from '../apartments/apartment.entity.js';
import { notFound, unavailable } from '../common/api-error.js';
import { isIsoDate } from '../common/dates.util.js';
import { newBookingCode } from './booking-code.js';
import { BookingUnit } from './booking-unit.entity.js';
import {
  Booking,
  BOOKING_STATUSES,
  type BookingKind,
  type BookingSource,
  type BookingStatus,
} from './booking.entity.js';

/** Everything of a booking that can be written, with the apartments as plain ids. */
export interface BookingDraft {
  kind: BookingKind;
  status: BookingStatus;
  source: BookingSource;
  checkIn: string;
  checkOut: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  adminNote: string;
  totalPrice: number | null;
  language: string;
  messageId: number | null;
  createdById: number | null;
  apartmentIds: number[];
}

export interface BookingFilter {
  status?: string;
  kind?: string;
  from?: string;
  to?: string;
  query?: string;
  order?: string;
}

/** One apartment being taken, without any guest data. */
export interface OccupiedRange {
  apartment_id: number;
  from: string;
  to: string;
  status: 'booked' | 'pending';
}

/** Bookings that hold their dates: a pending request blocks the calendar like a confirmed stay. */
const HOLDING = In(['pending', 'confirmed']);
const MAX_ITEMS = 500;
const SEARCHED = ['name', 'email', 'phone', 'code'] as const;

const overlapping = (from: string, to: string): FindOptionsWhere<Booking> => ({
  status: HOLDING,
  checkIn: LessThan(to),
  checkOut: MoreThan(from),
});

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingUnit) private readonly units: Repository<BookingUnit>,
    private readonly dataSource: DataSource,
  ) {}

  /** Checks availability and stores the booking in one transaction. Throws 409 when taken. */
  async create(draft: BookingDraft): Promise<Booking> {
    const id = await this.dataSource.transaction(async (manager) => {
      await this.assertFree(manager, draft, 0);
      const { apartmentIds, ...columns } = draft;
      const { identifiers } = await manager.insert(Booking, {
        ...columns,
        code: await this.freeCode(manager),
      });
      const bookingId = identifiers[0].id as number;
      await manager.insert(
        BookingUnit,
        apartmentIds.map((apartmentId) => ({ bookingId, apartmentId })),
      );
      return bookingId;
    });
    return this.findById(id);
  }

  /** Saves all editable fields, re-checking availability unless the booking is cancelled. */
  async update(
    id: number,
    draft: Omit<BookingDraft, 'source' | 'messageId' | 'createdById'>,
  ): Promise<Booking> {
    await this.dataSource.transaction(async (manager) => {
      await this.assertFree(manager, draft, id);
      const { apartmentIds, ...columns } = draft;
      const { affected } = await manager.update(Booking, id, columns);
      if (!affected) throw notFound();
      await manager.delete(BookingUnit, { bookingId: id });
      await manager.insert(
        BookingUnit,
        apartmentIds.map((apartmentId) => ({ bookingId: id, apartmentId })),
      );
    });
    return this.findById(id);
  }

  async findById(id: number): Promise<Booking> {
    const booking = await this.bookings.findOne({ where: { id }, relations: { units: true } });
    if (!booking) throw notFound();
    return booking;
  }

  async remove(id: number): Promise<void> {
    await this.bookings.delete(id);
  }

  list(filter: BookingFilter): Promise<Booking[]> {
    const common: FindOptionsWhere<Booking> = {};
    if ((BOOKING_STATUSES as readonly string[]).includes(filter.status ?? '')) {
      common.status = filter.status as BookingStatus;
    } else if (filter.status === 'active') {
      common.status = HOLDING;
    }
    if (filter.kind) common.kind = filter.kind as BookingKind;
    if (isIsoDate(filter.from)) common.checkOut = MoreThan(filter.from);
    if (isIsoDate(filter.to)) common.checkIn = LessThan(filter.to);

    const term = (filter.query ?? '').trim().replace(/[%_]/g, '');
    return this.bookings.find({
      where: term
        ? SEARCHED.map((column) => ({ ...common, [column]: ILike(`%${term}%`) }))
        : common,
      order:
        filter.order === 'created'
          ? { createdAt: 'DESC', id: 'DESC' }
          : { checkIn: 'ASC', id: 'ASC' },
      take: MAX_ITEMS,
      relations: { units: true },
    });
  }

  /** The taken ranges of all apartments overlapping `[from, to)`. */
  async occupancy(from: string, to: string): Promise<OccupiedRange[]> {
    const units = await this.units.find({
      where: { booking: overlapping(from, to) },
      relations: { booking: true },
      order: { apartmentId: 'ASC', booking: { checkIn: 'ASC' } },
    });
    return units.map(({ apartmentId, booking }) => ({
      apartment_id: apartmentId,
      from: booking.checkIn,
      to: booking.checkOut,
      status: booking.status === 'pending' ? 'pending' : 'booked',
    }));
  }

  /** Ids of the apartments that are taken for the given stay. */
  async unavailableApartments(checkIn: string, checkOut: string): Promise<number[]> {
    return this.takenIds(this.units.manager, { booking: overlapping(checkIn, checkOut) });
  }

  /**
   * Locking the apartment rows makes simultaneous requests for the same apartment wait for each
   * other, so two of them can never both find it free.
   */
  private async assertFree(
    manager: EntityManager,
    draft: Pick<BookingDraft, 'status' | 'apartmentIds' | 'checkIn' | 'checkOut'>,
    ownId: number,
  ): Promise<void> {
    if (draft.status === 'cancelled' || draft.apartmentIds.length === 0) return;
    await manager.find(Apartment, {
      select: { id: true },
      where: { id: In(draft.apartmentIds) },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    const taken = await this.takenIds(manager, {
      apartmentId: In(draft.apartmentIds),
      booking: { ...overlapping(draft.checkIn, draft.checkOut), id: Not(ownId) },
    });
    if (taken.length > 0) throw unavailable(taken);
  }

  private async takenIds(
    manager: EntityManager,
    where: FindOptionsWhere<BookingUnit>,
  ): Promise<number[]> {
    const units = await manager.find(BookingUnit, {
      select: { apartmentId: true, bookingId: true },
      where,
    });
    return [...new Set(units.map((unit) => unit.apartmentId))].sort((a, b) => a - b);
  }

  private async freeCode(manager: EntityManager): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newBookingCode();
      if (!(await manager.existsBy(Booking, { code }))) return code;
    }
    throw new Error('Could not find a free booking code');
  }
}
