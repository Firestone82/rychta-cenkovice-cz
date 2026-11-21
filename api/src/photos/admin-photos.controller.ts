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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { type FieldErrors, validationFailed } from '../common/api-error.js';
import { IdPipe } from '../common/id.pipe.js';
import { MAX_UPLOAD_BYTES, MediaService, NotAnImageError } from './media.service.js';
import { PHOTO_CATEGORIES } from './photo-categories.js';
import { presentPhoto } from './photo.presenter.js';
import {
  type PhotoListQuery,
  photoListQuerySchema,
  type PhotoUpdate,
  photoUpdateSchema,
  type PhotoUpload,
  photoUploadSchema,
} from './photos.schemas.js';
import { PhotosService } from './photos.service.js';

const ADMIN_PAGE = 200;

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('admin/photos')
export class AdminPhotosController {
  constructor(
    private readonly photos: PhotosService,
    private readonly media: MediaService,
  ) {}

  @Get()
  async list(@Query({ schema: photoListQuerySchema }) query: PhotoListQuery) {
    const { items, total } = await this.photos.list({
      category: query.category,
      apartmentId: query.apartment,
      offset: query.offset,
      limit: ADMIN_PAGE,
    });
    return { items: items.map(presentPhoto), total };
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(
    @Body({ schema: photoUploadSchema }) body: PhotoUpload,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const fields: FieldErrors = {};
    const apartmentId = await this.target(body.category, body.apartment_id, fields);
    if (!file) fields['file'] = 'required';
    if (!file || Object.keys(fields).length > 0) throw validationFailed(fields);

    const processed = await this.media.process(file.buffer).catch((error: unknown) => {
      if (error instanceof NotAnImageError) throw validationFailed({ file: 'not_an_image' });
      throw error;
    });
    try {
      const photo = await this.photos.create({
        category: body.category,
        apartmentId,
        alt: { cs: body.alt_cs, en: body.alt_en },
        sort: await this.photos.nextSort(),
        processed,
      });
      return presentPhoto(photo);
    } catch (error) {
      await this.media.remove(processed.file, processed.widths);
      throw error;
    }
  }

  @Patch(':id')
  async update(
    @Param('id', IdPipe) id: number,
    @Body({ schema: photoUpdateSchema }) body: PhotoUpdate,
  ) {
    const photo = await this.photos.findById(id);
    const category = body.category ?? photo.category;
    const fields: FieldErrors = {};
    const apartmentId = await this.target(
      category,
      body.apartment_id ?? photo.apartmentId ?? 0,
      fields,
    );
    if (Object.keys(fields).length > 0) throw validationFailed(fields);

    const updated = await this.photos.update(id, {
      category,
      apartmentId,
      alt: body.alt ?? photo.alt,
      sort: body.sort ?? photo.sort,
    });
    return presentPhoto(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', IdPipe) id: number): Promise<void> {
    const photo = await this.photos.findById(id);
    await this.photos.remove(id);
    await this.media.remove(photo.file, photo.widths);
  }

  /** Only photos of the `apartment` category belong to an apartment, and then it must exist. */
  private async target(
    category: string,
    apartmentId: number,
    fields: FieldErrors,
  ): Promise<number | null> {
    if (!(PHOTO_CATEGORIES as readonly string[]).includes(category)) {
      fields['category'] = 'invalid';
      return null;
    }
    if (category !== 'apartment') return null;
    if (apartmentId < 1 || !(await this.photos.apartmentExists(apartmentId))) {
      fields['apartment_id'] = 'unknown';
      return null;
    }
    return apartmentId;
  }
}
