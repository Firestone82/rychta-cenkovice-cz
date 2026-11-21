import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  type FindOptionsOrder,
  type FindOptionsWhere,
  LessThanOrEqual,
  MoreThan,
  Repository,
} from 'typeorm';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { addDays } from '../common/dates.util.js';
import { MessagesService } from '../messages/messages.service.js';
import { BookingUnit } from './booking-unit.entity.js';
import { Booking } from './booking.entity.js';
import { presentBooking } from './booking.presenter.js';

const HORIZON_DAYS = 14;
const MAX_ITEMS = 50;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingUnit) private readonly units: Repository<BookingUnit>,
    private readonly apartments: ApartmentsService,
    private readonly messages: MessagesService,
  ) {}

  /** Today and the next 14 days for the owner. */
  async summary(day: string) {
    const horizon = addDays(day, HORIZON_DAYS);
    const staying: FindOptionsWhere<Booking> = {
      status: 'confirmed',
      checkIn: LessThanOrEqual(day),
      checkOut: MoreThan(day),
    };
    const confirmedGuests: FindOptionsWhere<Booking> = { status: 'confirmed', kind: 'guest' };

    const [
      pendingBookings,
      newMessages,
      apartments,
      occupied,
      guests,
      arrivals,
      departures,
      pending,
    ] = await Promise.all([
      this.bookings.countBy({ status: 'pending' }),
      this.messages.countNew(),
      this.apartments.countActive(),
      this.units.find({
        select: { apartmentId: true, bookingId: true },
        where: { booking: staying },
      }),
      this.bookings.sum('guests', { ...staying, kind: 'guest' }),
      this.list(
        { ...confirmedGuests, checkIn: Between(day, horizon) },
        { checkIn: 'ASC', id: 'ASC' },
      ),
      this.list(
        { ...confirmedGuests, checkOut: Between(day, horizon) },
        { checkOut: 'ASC', id: 'ASC' },
      ),
      this.list({ status: 'pending' }, { createdAt: 'ASC', id: 'ASC' }),
    ]);

    return {
      pending_bookings: pendingBookings,
      new_messages: newMessages,
      occupied_tonight: new Set(occupied.map((unit) => unit.apartmentId)).size,
      apartments,
      guests_in_house: guests ?? 0,
      arrivals,
      departures,
      pending,
    };
  }

  private async list(where: FindOptionsWhere<Booking>, order: FindOptionsOrder<Booking>) {
    const bookings = await this.bookings.find({
      where,
      order,
      take: MAX_ITEMS,
      relations: { units: true },
    });
    return bookings.map(presentBooking);
  }
}
