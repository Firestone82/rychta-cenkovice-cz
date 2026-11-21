import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { notFound } from '../common/api-error.js';
import { today } from '../common/dates.util.js';
import { News } from './news.entity.js';
import type { NewsInput } from './news.schemas.js';

const MAX_ITEMS = 200;

export const presentNews = (news: News) => ({
  id: news.id,
  title: { cs: news.title.cs, en: news.title.en },
  body: { cs: news.body.cs, en: news.body.en },
  published: news.published,
  published_at: news.publishedAt,
});

@Injectable()
export class NewsService {
  constructor(@InjectRepository(News) private readonly news: Repository<News>) {}

  list(onlyPublished: boolean): Promise<News[]> {
    return this.news.find({
      where: onlyPublished ? { published: true } : {},
      order: { publishedAt: 'DESC', id: 'DESC' },
      take: MAX_ITEMS,
    });
  }

  create(input: NewsInput): Promise<News> {
    return this.news.save(this.news.create(this.columns(input)));
  }

  async update(id: number, input: NewsInput): Promise<News> {
    const { affected } = await this.news.update(id, this.columns(input));
    if (!affected) throw notFound();
    return this.news.findOneByOrFail({ id });
  }

  async remove(id: number): Promise<void> {
    await this.news.delete(id);
  }

  private columns(input: NewsInput) {
    return {
      title: input.title,
      body: input.body,
      published: input.published,
      publishedAt: input.published_at || today(),
    };
  }
}
