import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ChannelsModule } from '../channels/channels.module.js';
import { FormsModule } from '../forms/forms.module.js';
import { MailModule } from '../mail/mail.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { AdminBookingsController } from './admin-bookings.controller.js';
import { AvailabilityController } from './availability.controller.js';
import { BookingEditorService } from './booking-editor.service.js';
import { BookingRequestsController } from './booking-requests.controller.js';
import { BookingRequestsService } from './booking-requests.service.js';
import { BookingUnit } from './booking-unit.entity.js';
import { Booking } from './booking.entity.js';
import { BookingsService } from './bookings.service.js';
import { DashboardService } from './dashboard.service.js';
import { StayService } from './stay.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingUnit]),
    ApartmentsModule,
    AuthModule,
    ChannelsModule,
    FormsModule,
    MailModule,
    MessagesModule,
  ],
  controllers: [AvailabilityController, BookingRequestsController, AdminBookingsController],
  providers: [
    BookingsService,
    StayService,
    BookingRequestsService,
    BookingEditorService,
    DashboardService,
  ],
  exports: [BookingsService],
})
export class BookingsModule {}
