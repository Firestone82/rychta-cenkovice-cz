import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Apartment } from '../apartments/apartment.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { Booking } from '../bookings/booking.entity.js';
import { AdminChannelsController } from './admin-channels.controller.js';
import { ChannelConnection } from './channel-connection.entity.js';
import { ChannelFeedService } from './channel-feed.service.js';
import { ChannelSyncService } from './channel-sync.service.js';
import { ChannelsService } from './channels.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelConnection, Apartment, Booking]), AuthModule],
  controllers: [AdminChannelsController],
  providers: [ChannelsService, ChannelSyncService, ChannelFeedService],
  exports: [ChannelSyncService],
})
export class ChannelsModule {}
