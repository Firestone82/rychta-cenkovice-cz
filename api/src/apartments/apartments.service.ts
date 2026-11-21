import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { type FieldErrors, notFound, validationFailed } from '../common/api-error.js';
import { AMENITIES, MAX_LABELS } from './apartment-options.js';
import { Apartment } from './apartment.entity.js';
import type { ApartmentUpdate } from './apartments.schemas.js';

@Injectable()
export class ApartmentsService {
  constructor(@InjectRepository(Apartment) private readonly apartments: Repository<Apartment>) {}

  list(onlyActive: boolean): Promise<Apartment[]> {
    return this.apartments.find({
      where: onlyActive ? { active: true } : {},
      order: { sort: 'ASC', number: 'ASC' },
    });
  }

  async findBySlug(slug: string): Promise<Apartment> {
    const apartment = await this.apartments.findOneBy({ slug });
    if (!apartment) throw notFound();
    return apartment;
  }

  async findById(id: number): Promise<Apartment> {
    const apartment = await this.apartments.findOneBy({ id });
    if (!apartment) throw notFound();
    return apartment;
  }

  findByIds(ids: number[]): Promise<Apartment[]> {
    return this.apartments.findBy({ id: In(ids) });
  }

  countActive(): Promise<number> {
    return this.apartments.countBy({ active: true });
  }

  count(): Promise<number> {
    return this.apartments.count();
  }

  async create(apartment: Partial<Apartment>): Promise<Apartment> {
    return this.apartments.save(this.apartments.create(apartment));
  }

  async update(id: number, changes: ApartmentUpdate): Promise<Apartment> {
    const apartment = await this.findById(id);
    const fields: FieldErrors = {};

    if (changes.amenities) {
      // Stored in the order of the fixed list, without repeats.
      const chosen = new Set<string>(changes.amenities);
      apartment.amenities = AMENITIES.filter((key) => chosen.has(key));
    }
    if (changes.labels) {
      apartment.labels = changes.labels
        .map((label) => ({ cs: label.cs || label.en, en: label.en }))
        .filter((label) => label.cs !== '');
      if (apartment.labels.length > MAX_LABELS) fields['labels'] = 'too_many';
    }
    if (Object.keys(fields).length > 0) throw validationFailed(fields);

    // A name given in English only is used for Czech too; an empty English one follows Czech.
    if (changes.name)
      apartment.name = { cs: changes.name.cs || changes.name.en, en: changes.name.en };
    apartment.area = changes.area ?? apartment.area;
    apartment.beds = changes.beds ?? apartment.beds;
    apartment.extraBeds = changes.extra_beds ?? apartment.extraBeds;
    apartment.accessible = changes.accessible ?? apartment.accessible;
    apartment.floor = changes.floor ?? apartment.floor;
    apartment.flatType = changes.flat_type ?? apartment.flatType;
    apartment.layout = changes.layout ?? apartment.layout;
    apartment.features = changes.features ?? apartment.features;
    apartment.note = changes.note ?? apartment.note;
    apartment.description = changes.description ?? apartment.description;
    apartment.minNights = changes.min_nights ?? apartment.minNights;
    apartment.active = changes.active ?? apartment.active;
    if (changes.price_per_night != null) apartment.pricePerNight = changes.price_per_night;
    if (changes.clear_price) apartment.pricePerNight = null;

    return this.apartments.save(apartment);
  }
}
