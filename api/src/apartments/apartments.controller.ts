import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { notFound } from '../common/api-error.js';
import { ApartmentViewsService } from './apartment-views.service.js';
import { ApartmentsService } from './apartments.service.js';

@ApiTags('apartments')
@Controller('apartments')
export class ApartmentsController {
  constructor(
    private readonly apartments: ApartmentsService,
    private readonly views: ApartmentViewsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  async list() {
    return { items: await this.views.withCovers(await this.apartments.list(true)) };
  }

  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=60')
  async detail(@Param('slug') slug: string) {
    const apartment = await this.apartments.findBySlug(slug);
    if (!apartment.active) throw notFound();
    return this.views.withPhotos(apartment);
  }
}
