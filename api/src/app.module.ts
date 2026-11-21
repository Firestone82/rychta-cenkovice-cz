import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ApartmentsModule } from './apartments/apartments.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { appConfig } from './config/app.config.js';
import { DatabaseModule } from './database/database.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { PhotosModule } from './photos/photos.module.js';
import { SeedModule } from './seed/seed.module.js';
import { SiteModule } from './site/site.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig], envFilePath: ['.env', '../.env'] }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    SiteModule,
    AuthModule,
    ApartmentsModule,
    BookingsModule,
    MessagesModule,
    PhotosModule,
    SeedModule,
  ],
})
export class AppModule {}
