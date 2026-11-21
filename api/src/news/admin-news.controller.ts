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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { IdPipe } from '../common/id.pipe.js';
import { type NewsInput, newsSchema } from './news.schemas.js';
import { NewsService, presentNews } from './news.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('admin/news')
export class AdminNewsController {
  constructor(private readonly news: NewsService) {}

  /** Every item, drafts included. */
  @Get()
  async list() {
    return { items: (await this.news.list(false)).map(presentNews) };
  }

  @Post()
  async create(@Body({ schema: newsSchema }) body: NewsInput) {
    return presentNews(await this.news.create(body));
  }

  /** Replaces the whole item. */
  @Patch(':id')
  async update(@Param('id', IdPipe) id: number, @Body({ schema: newsSchema }) body: NewsInput) {
    return presentNews(await this.news.update(id, body));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', IdPipe) id: number): Promise<void> {
    return this.news.remove(id);
  }
}
