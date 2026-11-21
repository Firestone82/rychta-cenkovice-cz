import { Module } from '@nestjs/common';
import { ApartmentsModule } from '../apartments/apartments.module.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { PhotosModule } from '../photos/photos.module.js';
import { DemoSeedService } from './demo-seed.service.js';
import { PhotoImportService } from './photo-import.service.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [ApartmentsModule, BookingsModule, MessagesModule, PhotosModule],
  providers: [SeedService, DemoSeedService, PhotoImportService],
  exports: [DemoSeedService, PhotoImportService],
})
export class SeedModule {}
