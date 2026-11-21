import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { notFound } from '../common/api-error.js';
import { Apartment } from '../apartments/apartment.entity.js';
import type { ProcessedPhoto } from './media.service.js';
import { Photo } from './photo.entity.js';

export interface PhotoFilter {
  category?: string;
  apartmentId?: number;
  offset?: number;
  limit?: number;
  /** Also returns `misc` photos and photos whose file has not been imported yet. */
  includeHidden?: boolean;
}

export interface NewPhoto {
  category: string;
  apartmentId: number | null;
  alt: { cs: string; en: string };
  sort: number;
  sourcePath?: string;
  processed?: ProcessedPhoto;
}

const DEFAULT_PAGE = 24;
const MAX_PAGE = 200;
const ORDER = { sort: 'ASC', id: 'ASC' } as const;

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo) private readonly photos: Repository<Photo>,
    @InjectRepository(Apartment) private readonly apartments: Repository<Apartment>,
  ) {}

  /** One page of photos and the total count for the filter. */
  async list(filter: PhotoFilter): Promise<{ items: Photo[]; total: number }> {
    const where: FindOptionsWhere<Photo> = {};
    if (!filter.includeHidden) where.file = Not('');
    if (filter.category) where.category = filter.category;
    else if (!filter.includeHidden) where.category = Not('misc');
    if (filter.apartmentId && filter.apartmentId > 0) where.apartmentId = filter.apartmentId;

    const limit =
      filter.limit && filter.limit > 0 && filter.limit <= MAX_PAGE ? filter.limit : DEFAULT_PAGE;
    const [items, total] = await this.photos.findAndCount({
      where,
      order: ORDER,
      skip: Math.max(filter.offset ?? 0, 0),
      take: limit,
    });
    return { items, total };
  }

  async findById(id: number): Promise<Photo> {
    const photo = await this.photos.findOneBy({ id });
    if (!photo) throw notFound();
    return photo;
  }

  /** Number of imported photos per gallery category. */
  async categories(): Promise<Record<string, number>> {
    const rows = await this.photos
      .createQueryBuilder('photo')
      .select('photo.category', 'category')
      .addSelect('COUNT(*)::int', 'count')
      .where({ file: Not(''), category: Not('misc') })
      .groupBy('photo.category')
      .getRawMany<{ category: string; count: number }>();
    return Object.fromEntries(rows.map((row) => [row.category, row.count]));
  }

  /** The first imported photo of every category (used for teasers). */
  async covers(): Promise<Record<string, Photo>> {
    const firsts = await this.photos
      .createQueryBuilder('photo')
      .distinctOn(['photo.category'])
      .where({ file: Not(''), category: Not('apartment') })
      .orderBy({ 'photo.category': 'ASC', 'photo.sort': 'ASC', 'photo.id': 'ASC' })
      .getMany();
    return Object.fromEntries(firsts.map((photo) => [photo.category, photo]));
  }

  /** The first imported photo of each given apartment, by apartment id. */
  async apartmentCovers(apartmentIds: number[]): Promise<Map<number, Photo>> {
    if (apartmentIds.length === 0) return new Map();
    const firsts = await this.photos
      .createQueryBuilder('photo')
      .distinctOn(['photo.apartmentId'])
      .where({ file: Not(''), apartmentId: In(apartmentIds) })
      .orderBy({ 'photo.apartmentId': 'ASC', 'photo.sort': 'ASC', 'photo.id': 'ASC' })
      .getMany();
    return new Map(firsts.map((photo) => [photo.apartmentId!, photo]));
  }

  /** A sort value that puts a new photo last. */
  async nextSort(): Promise<number> {
    const max = await this.photos.maximum('sort');
    return (max ?? 0) + 10;
  }

  apartmentExists(id: number): Promise<boolean> {
    return this.apartments.existsBy({ id });
  }

  async create(photo: NewPhoto): Promise<Photo> {
    const { processed, ...rest } = photo;
    const { identifiers } = await this.photos.insert({ ...rest, ...processed });
    return this.findById(identifiers[0].id as number);
  }

  async update(
    id: number,
    changes: Pick<Photo, 'category' | 'apartmentId' | 'alt' | 'sort'>,
  ): Promise<Photo> {
    const { affected } = await this.photos.update(id, changes);
    if (!affected) throw notFound();
    return this.findById(id);
  }

  /** Stores the generated files of a photo taken over from the old website. */
  async setFile(id: number, processed: ProcessedPhoto): Promise<void> {
    await this.photos.update(id, processed);
  }

  async remove(id: number): Promise<void> {
    await this.photos.delete(id);
  }

  /** Every photo row in gallery order, including the ones not imported yet. */
  all(): Promise<Photo[]> {
    return this.photos.find({ order: ORDER });
  }
}
