import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apartment } from '../apartments/apartment.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminPhotosController } from './admin-photos.controller.js';
import { MediaService } from './media.service.js';
import { Photo } from './photo.entity.js';
import { PhotosController } from './photos.controller.js';
import { PhotosService } from './photos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Photo, Apartment]), AuthModule],
  controllers: [PhotosController, AdminPhotosController],
  providers: [PhotosService, MediaService],
  exports: [PhotosService, MediaService],
})
export class PhotosModule {}
