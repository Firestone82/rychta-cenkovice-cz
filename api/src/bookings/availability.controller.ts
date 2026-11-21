import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { validationFailed } from '../common/api-error.js';
import { isIsoDate, nightsBetween } from '../common/dates.util.js';
import {
  type OccupancyQuery,
  occupancyQuerySchema,
  type StayQuery,
  stayQuerySchema,
} from './bookings.schemas.js';
import { BookingsService } from './bookings.service.js';

const MAX_RANGE_DAYS = 800;

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly bookings: BookingsService) {}

  /** The taken date ranges of every apartment in `[from, to)`, without guest data. */
  @Get()
  async occupancy(@Query({ schema: occupancyQuerySchema }) { from, to }: OccupancyQuery) {
    const days = nightsBetween(from, to);
    if (!isIsoDate(from) || !isIsoDate(to) || days <= 0 || days > MAX_RANGE_DAYS) {
      throw validationFailed({ from: 'invalid', to: 'invalid' });
    }
    return { from, to, ranges: await this.bookings.occupancy(from, to) };
  }

  /** Which apartments are taken for one concrete stay. */
  @Get('check')
  async check(@Query({ schema: stayQuerySchema }) { check_in, check_out }: StayQuery) {
    const nights = nightsBetween(check_in, check_out);
    if (!isIsoDate(check_in) || !isIsoDate(check_out) || nights <= 0) {
      throw validationFailed({ check_in: 'invalid', check_out: 'invalid' });
    }
    return {
      check_in,
      check_out,
      nights,
      unavailable_ids: await this.bookings.unavailableApartments(check_in, check_out),
    };
  }
}
