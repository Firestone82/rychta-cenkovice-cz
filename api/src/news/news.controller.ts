import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NewsService, presentNews } from './news.service.js';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  async list() {
    return { items: (await this.news.list(true)).map(presentNews) };
  }
}
