import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { PhotosModule } from '../photos/photos.module.js';
import { AdminApartmentsController } from './admin-apartments.controller.js';
import { ApartmentViewsService } from './apartment-views.service.js';
import { Apartment } from './apartment.entity.js';
import { ApartmentsController } from './apartments.controller.js';
import { ApartmentsService } from './apartments.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Apartment]), AuthModule, PhotosModule],
  controllers: [ApartmentsController, AdminApartmentsController],
  providers: [ApartmentsService, ApartmentViewsService],
  exports: [ApartmentsService],
})
export class ApartmentsModule {}
