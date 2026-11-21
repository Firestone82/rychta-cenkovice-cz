import { Injectable } from '@nestjs/common';
import type { Apartment } from '../apartments/apartment.entity.js';
import { type FieldErrors, validationFailed } from '../common/api-error.js';
import { isEmail, isPhone } from '../common/schemas.js';
import { type AppConfig, InjectConfig } from '../config/app.config.js';
import { MailService } from '../mail/mail.service.js';
import { MessagesService } from '../messages/messages.service.js';
import { type GuestNotice, guestMail } from './booking-mails.js';
import {
  BOOKING_KINDS,
  BOOKING_STATUSES,
  type BookingKind,
  type BookingStatus,
} from './booking.entity.js';
import { type BookingView, presentBooking } from './booking.presenter.js';
import type { AdminBookingInput } from './bookings.schemas.js';
import { type BookingDraft, BookingsService } from './bookings.service.js';
import { StayService } from './stay.service.js';

const MAX_GUESTS = 200;
const MAX_PRICE = 100_000_000;

/** Bookings entered or changed by the owner in the administration. */
@Injectable()
export class BookingEditorService {
  constructor(
    private readonly bookings: BookingsService,
    private readonly stays: StayService,
    private readonly messages: MessagesService,
    private readonly mail: MailService,
    @InjectConfig() private readonly config: AppConfig,
  ) {}

  /** Enters a booking by hand, for example from a phone call or a contact form message. */
  async create(input: AdminBookingInput, userId: number): Promise<BookingView> {
    const draft: BookingDraft = {
      kind: 'guest',
      status: 'confirmed',
      source: 'admin',
      checkIn: '',
      checkOut: '',
      guests: 1,
      name: '',
      email: '',
      phone: '',
      note: '',
      adminNote: '',
      totalPrice: null,
      language: 'cs',
      messageId: null,
      createdById: userId,
      apartmentIds: [],
    };
    this.apply(input, draft);
    if (input.message_id) {
      if (!(await this.messages.exists(input.message_id)))
        throw validationFailed({ message_id: 'unknown' });
      draft.messageId = input.message_id;
    }
    // Without a price in the request the price follows the nightly prices.
    const autoPrice = input.auto_price || (input.total_price == null && !input.clear_price);
    const apartments = await this.validate(draft, autoPrice);

    const booking = presentBooking(await this.bookings.create(draft));
    if (draft.messageId) await this.messages.setStatus(draft.messageId, 'read');
    if (input.notify && booking.status === 'confirmed') {
      this.notify(booking, apartments, 'confirmed', input.guest_message);
    }
    return booking;
  }

  async update(id: number, input: AdminBookingInput): Promise<BookingView> {
    const current = await this.bookings.findById(id);
    const draft: BookingDraft = {
      kind: current.kind,
      status: current.status,
      source: current.source,
      checkIn: current.checkIn,
      checkOut: current.checkOut,
      guests: current.guests,
      name: current.name,
      email: current.email,
      phone: current.phone,
      note: current.note,
      adminNote: current.adminNote,
      totalPrice: current.totalPrice,
      language: current.language,
      messageId: current.messageId,
      createdById: current.createdById,
      apartmentIds: current.units.map((unit) => unit.apartmentId),
    };
    this.apply(input, draft);
    const apartments = await this.validate(draft, input.auto_price);

    const {
      source: _source,
      messageId: _messageId,
      createdById: _createdById,
      ...editable
    } = draft;
    const booking = presentBooking(await this.bookings.update(id, editable));
    if (input.notify && booking.status !== current.status && booking.status !== 'pending') {
      this.notify(booking, apartments, booking.status, input.guest_message);
    }
    return booking;
  }

  private apply(input: AdminBookingInput, draft: BookingDraft): void {
    // An unknown kind or status is kept as sent, so that validation can name the field.
    draft.kind = (input.kind as BookingKind | undefined) ?? draft.kind;
    draft.status = (input.status as BookingStatus | undefined) ?? draft.status;
    draft.checkIn = input.check_in ?? draft.checkIn;
    draft.checkOut = input.check_out ?? draft.checkOut;
    draft.guests = input.guests ?? draft.guests;
    draft.name = input.name ?? draft.name;
    draft.email = input.email ?? draft.email;
    draft.phone = input.phone ?? draft.phone;
    draft.note = input.note ?? draft.note;
    draft.adminNote = input.admin_note ?? draft.adminNote;
    draft.language = input.language ?? draft.language;
    draft.apartmentIds = input.apartment_ids ?? draft.apartmentIds;
    if (input.total_price != null) draft.totalPrice = input.total_price;
    if (input.clear_price) draft.totalPrice = null;
  }

  /** Throws 422 with every problem; otherwise returns the booked apartments. */
  private async validate(draft: BookingDraft, autoPrice: boolean): Promise<Apartment[]> {
    const fields: FieldErrors = {};
    if (!BOOKING_KINDS.includes(draft.kind)) fields['kind'] = 'invalid';
    if (!BOOKING_STATUSES.includes(draft.status)) fields['status'] = 'invalid';
    if (draft.kind === 'guest') {
      if (draft.name.length < 2 || draft.name.length > 120) fields['name'] = 'required';
      if (draft.email && !isEmail(draft.email)) fields['email'] = 'invalid';
      if (draft.phone && !isPhone(draft.phone)) fields['phone'] = 'invalid';
      if (draft.guests < 1 || draft.guests > MAX_GUESTS) fields['guests'] = 'invalid';
    } else {
      // Blocked dates have no guests and nothing to wait for.
      draft.guests = 0;
      if (draft.status === 'pending') draft.status = 'confirmed';
    }
    if (draft.note.length > 2000 || draft.adminNote.length > 4000) fields['note'] = 'too_long';
    if (draft.totalPrice !== null && (draft.totalPrice < 0 || draft.totalPrice > MAX_PRICE)) {
      fields['total_price'] = 'invalid';
    }
    const { apartments, price } = await this.stays.check(draft, false, fields);
    if (Object.keys(fields).length > 0) throw validationFailed(fields);

    if (autoPrice) draft.totalPrice = price;
    draft.apartmentIds = apartments.map((apartment) => apartment.id);
    return apartments;
  }

  private notify(
    booking: BookingView,
    apartments: Apartment[],
    notice: GuestNotice,
    message: string,
  ): void {
    if (booking.kind !== 'guest' || !booking.email) return;
    const settings = { owner: this.config.mail.to, publicUrl: this.config.publicUrl };
    this.mail.send(guestMail(booking, apartments, notice, message, settings));
  }
}
