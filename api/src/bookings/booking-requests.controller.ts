import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientIp } from '../common/client-ip.decorator.js';
import { HoneypotReply, PublicFormInterceptor } from '../forms/public-form.interceptor.js';
import { newBookingCode } from './booking-code.js';
import { BookingRequestsService } from './booking-requests.service.js';
import { type BookingRequest, bookingRequestSchema } from './bookings.schemas.js';

@ApiTags('bookings')
@Controller('bookings')
export class BookingRequestsController {
  constructor(private readonly requests: BookingRequestsService) {}

  /** A guest's booking request. Answers 409 with `apartment_ids` when the dates were just taken. */
  @Post()
  @UseInterceptors(PublicFormInterceptor)
  @HoneypotReply(() => ({ code: newBookingCode(), status: 'pending' }))
  async create(
    @Body({ schema: bookingRequestSchema }) body: BookingRequest,
    @ClientIp() ip: string,
  ) {
    const booking = await this.requests.submit(body, ip);
    return {
      code: booking.code,
      status: booking.status,
      check_in: booking.check_in,
      check_out: booking.check_out,
      nights: booking.nights,
      total_price: booking.total_price,
    };
  }
}
