import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { SessionUser } from '../auth/access-token.service.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { StaffGuard } from '../auth/staff.guard.js';
import { ChannelSyncService } from '../channels/channel-sync.service.js';
import { importedBlock } from '../common/api-error.js';
import { today } from '../common/dates.util.js';
import { IdPipe } from '../common/id.pipe.js';
import { BookingEditorService } from './booking-editor.service.js';
import type { Booking } from './booking.entity.js';
import { presentBooking } from './booking.presenter.js';
import {
  type AdminBookingInput,
  adminBookingSchema,
  type BookingListQuery,
  bookingListQuerySchema,
} from './bookings.schemas.js';
import { BookingsService } from './bookings.service.js';
import { DashboardService } from './dashboard.service.js';

/** Read-only accounts may list and open bookings; everything else needs staff or an administrator. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('admin')
export class AdminBookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly editor: BookingEditorService,
    private readonly dashboardData: DashboardService,
    private readonly channels: ChannelSyncService,
  ) {}

  @Get('dashboard')
  @UseGuards(StaffGuard)
  async dashboard() {
    const day = today();
    return { today: day, dashboard: await this.dashboardData.summary(day) };
  }

  @Get('bookings')
  async list(@Query({ schema: bookingListQuerySchema }) { q, ...filter }: BookingListQuery) {
    return { items: (await this.bookings.list({ ...filter, query: q })).map(presentBooking) };
  }

  @Post('bookings')
  @UseGuards(StaffGuard)
  async create(
    @Body({ schema: adminBookingSchema }) body: AdminBookingInput,
    @CurrentUser() user: SessionUser,
  ) {
    const booking = await this.editor.create(body, user.id);
    this.channels.refresh(booking.apartment_ids);
    return booking;
  }

  @Get('bookings/:id')
  async detail(@Param('id', IdPipe) id: number) {
    return presentBooking(await this.bookings.findById(id));
  }

  @Patch('bookings/:id')
  @UseGuards(StaffGuard)
  async update(
    @Param('id', IdPipe) id: number,
    @Body({ schema: adminBookingSchema }) body: AdminBookingInput,
  ) {
    const before = await this.editable(id);
    const booking = await this.editor.update(id, body);
    this.channels.refresh([...apartmentIds(before), ...booking.apartment_ids]);
    return booking;
  }

  @Delete('bookings/:id')
  @UseGuards(StaffGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', IdPipe) id: number): Promise<void> {
    const before = await this.editable(id);
    await this.bookings.remove(id);
    this.channels.refresh(apartmentIds(before));
  }

  /** A block imported from a portal's calendar is changed there, not here. */
  private async editable(id: number): Promise<Booking> {
    const booking = await this.bookings.findById(id);
    if (booking.channelConnectionId !== null) throw importedBlock();
    return booking;
  }
}

const apartmentIds = (booking: Booking): number[] => booking.units.map((unit) => unit.apartmentId);
