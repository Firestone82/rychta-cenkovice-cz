import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AdminNewsController } from './admin-news.controller.js';
import { NewsController } from './news.controller.js';
import { News } from './news.entity.js';
import { NewsService } from './news.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([News]), AuthModule],
  controllers: [NewsController, AdminNewsController],
  providers: [NewsService],
})
export class NewsModule {}
