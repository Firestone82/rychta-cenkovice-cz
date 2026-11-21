import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { presentPhoto } from './photo.presenter.js';
import { type PhotoListQuery, photoListQuerySchema } from './photos.schemas.js';
import { PhotosService } from './photos.service.js';

const DEFAULT_PAGE = 24;
const MAX_PAGE = 60;

@ApiTags('photos')
@Controller('photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  /** A page of the gallery. The first page also carries the photo count of every category. */
  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  async list(@Query({ schema: photoListQuerySchema }) query: PhotoListQuery) {
    const offset = Math.max(query.offset, 0);
    const limit = query.limit > 0 && query.limit <= MAX_PAGE ? query.limit : DEFAULT_PAGE;
    const { items, total } = await this.photos.list({
      category: query.category,
      apartmentId: query.apartment,
      offset,
      limit,
    });
    const end = offset + items.length;
    return {
      items: items.map(presentPhoto),
      total,
      next_offset: end < total ? end : null,
      ...(offset === 0 && { categories: await this.photos.categories() }),
    };
  }

  /** One lead photo per gallery category. */
  @Get('covers')
  @Header('Cache-Control', 'public, max-age=60')
  async covers() {
    const covers = await this.photos.covers();
    return {
      covers: Object.fromEntries(
        Object.entries(covers).map(([category, photo]) => [category, presentPhoto(photo)]),
      ),
    };
  }
}
