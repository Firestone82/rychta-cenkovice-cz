import { Injectable } from '@nestjs/common';
import type { Apartment } from '../apartments/apartment.entity.js';
import { ApartmentsService } from '../apartments/apartments.service.js';
import type { FieldErrors } from '../common/api-error.js';
import { addYears, isIsoDate, nightsBetween, today } from '../common/dates.util.js';

export interface Stay {
  apartmentIds: number[];
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface CheckedStay {
  /** The selected apartments, without repeats, in the order they were asked for. */
  apartments: Apartment[];
  /** Price from the nightly prices; null when any of them is unknown. */
  price: number | null;
}

const MAX_NIGHTS_GUEST = 90;
const MAX_NIGHTS = 400;

@Injectable()
export class StayService {
  constructor(private readonly apartments: ApartmentsService) {}

  /**
   * Checks dates, apartments and guest count, writing what is wrong into `fields`.
   * A request from the website (`fromGuest`) must also lie in the future, respect the minimum
   * stay and fit the beds; the owner may enter anything.
   */
  async check(stay: Stay, fromGuest: boolean, fields: FieldErrors): Promise<CheckedStay> {
    const nights = this.checkDates(stay, fromGuest, fields);

    if (stay.apartmentIds.length === 0) {
      fields['apartment_ids'] = 'required';
      return { apartments: [], price: null };
    }
    const ids = [...new Set(stay.apartmentIds)];
    const found = new Map(
      (await this.apartments.findByIds(ids)).map((apartment) => [apartment.id, apartment]),
    );
    const selected = ids.map((id) => found.get(id));
    if (
      !selected.every(
        (apartment): apartment is Apartment => !!apartment && (!fromGuest || apartment.active),
      )
    ) {
      fields['apartment_ids'] = 'unknown';
      return { apartments: [], price: null };
    }

    if (fromGuest) {
      if (nights > 0 && selected.some((apartment) => nights < apartment.minNights)) {
        fields['check_out'] = 'min_nights';
      }
      const capacity = selected.reduce(
        (sum, apartment) => sum + apartment.beds + apartment.extraBeds,
        0,
      );
      if (stay.guests < 1 || stay.guests > capacity) fields['guests'] = 'over_capacity';
    }

    const priced = nights > 0 && selected.every((apartment) => apartment.pricePerNight !== null);
    const price = priced
      ? selected.reduce((sum, apartment) => sum + (apartment.pricePerNight ?? 0) * nights, 0)
      : null;
    return { apartments: selected, price };
  }

  /** Number of nights, or 0 when the dates do not make a stay. */
  private checkDates(stay: Stay, fromGuest: boolean, fields: FieldErrors): number {
    if (!isIsoDate(stay.checkIn)) {
      fields['check_in'] = 'invalid';
      return 0;
    }
    if (!isIsoDate(stay.checkOut)) {
      fields['check_out'] = 'invalid';
      return 0;
    }
    const nights = nightsBetween(stay.checkIn, stay.checkOut);
    if (nights <= 0) {
      fields['check_out'] = 'before_check_in';
      return 0;
    }
    if (nights > (fromGuest ? MAX_NIGHTS_GUEST : MAX_NIGHTS)) fields['check_out'] = 'too_long';
    if (fromGuest) {
      const now = today();
      if (stay.checkIn < now) fields['check_in'] = 'in_past';
      else if (stay.checkIn > addYears(now, 2)) fields['check_in'] = 'too_far';
    }
    return nights;
  }
}
