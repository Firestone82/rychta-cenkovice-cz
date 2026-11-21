import { Injectable } from '@nestjs/common';
import { type FieldErrors, validationFailed } from '../common/api-error.js';
import { type AppConfig, InjectConfig } from '../config/app.config.js';
import { CaptchaService } from '../forms/captcha.service.js';
import { MailService } from '../mail/mail.service.js';
import { guestMail, ownerRequestMail } from './booking-mails.js';
import { type BookingView, presentBooking } from './booking.presenter.js';
import type { BookingRequest } from './bookings.schemas.js';
import { BookingsService } from './bookings.service.js';
import { StayService } from './stay.service.js';

/** Booking requests sent by guests through the website. */
@Injectable()
export class BookingRequestsService {
  constructor(
    private readonly bookings: BookingsService,
    private readonly stays: StayService,
    private readonly captcha: CaptchaService,
    private readonly mail: MailService,
    @InjectConfig() private readonly config: AppConfig,
  ) {}

  /**
   * Stores the request as `pending`: the dates are held for the guest until the owner confirms
   * or declines. Both get an e-mail.
   */
  async submit(request: BookingRequest, ip: string): Promise<BookingView> {
    const fields: FieldErrors = {};
    const stay = {
      apartmentIds: request.apartment_ids,
      checkIn: request.check_in,
      checkOut: request.check_out,
      guests: request.guests,
    };
    const { apartments, price } = await this.stays.check(stay, true, fields);
    this.captcha.requireToken(request.captcha_token, fields);
    if (Object.keys(fields).length > 0) throw validationFailed(fields);
    await this.captcha.assertPassed(request.captcha_token, ip);

    const booking = presentBooking(
      await this.bookings.create({
        ...stay,
        apartmentIds: apartments.map((apartment) => apartment.id),
        kind: 'guest',
        status: 'pending',
        source: 'web',
        name: request.name,
        email: request.email,
        phone: request.phone,
        note: request.note,
        adminNote: '',
        totalPrice: price,
        language: request.language,
        messageId: null,
        createdById: null,
      }),
    );
    const settings = { owner: this.config.mail.to, publicUrl: this.config.publicUrl };
    this.mail.send(ownerRequestMail(booking, apartments, settings));
    this.mail.send(guestMail(booking, apartments, 'received', '', settings));
    return booking;
  }
}
