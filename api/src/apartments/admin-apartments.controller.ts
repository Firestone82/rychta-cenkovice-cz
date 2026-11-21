import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { IdPipe } from '../common/id.pipe.js';
import { presentApartment } from './apartment.presenter.js';
import { ApartmentViewsService } from './apartment-views.service.js';
import { type ApartmentUpdate, apartmentUpdateSchema } from './apartments.schemas.js';
import { ApartmentsService } from './apartments.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('admin/apartments')
export class AdminApartmentsController {
  constructor(
    private readonly apartments: ApartmentsService,
    private readonly views: ApartmentViewsService,
  ) {}

  /** Every apartment, including the ones hidden from the website. */
  @Get()
  async list() {
    return { items: await this.views.withCovers(await this.apartments.list(false)) };
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id', IdPipe) id: number,
    @Body({ schema: apartmentUpdateSchema }) body: ApartmentUpdate,
  ) {
    return presentApartment(await this.apartments.update(id, body), null);
  }
}
