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
import { today } from '../common/dates.util.js';
import { IdPipe } from '../common/id.pipe.js';
import { BookingEditorService } from './booking-editor.service.js';
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
  create(
    @Body({ schema: adminBookingSchema }) body: AdminBookingInput,
    @CurrentUser() user: SessionUser,
  ) {
    return this.editor.create(body, user.id);
  }

  @Get('bookings/:id')
  async detail(@Param('id', IdPipe) id: number) {
    return presentBooking(await this.bookings.findById(id));
  }

  @Patch('bookings/:id')
  @UseGuards(StaffGuard)
  update(
    @Param('id', IdPipe) id: number,
    @Body({ schema: adminBookingSchema }) body: AdminBookingInput,
  ) {
    return this.editor.update(id, body);
  }

  @Delete('bookings/:id')
  @UseGuards(StaffGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', IdPipe) id: number): Promise<void> {
    return this.bookings.remove(id);
  }
}
