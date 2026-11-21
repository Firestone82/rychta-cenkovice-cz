import { Injectable } from '@nestjs/common';
import { presentPhoto } from '../photos/photo.presenter.js';
import { PhotosService } from '../photos/photos.service.js';
import type { Apartment } from './apartment.entity.js';
import { presentApartment } from './apartment.presenter.js';

const MAX_PHOTOS = 100;

/** Puts apartments together with their photos for the API responses. */
@Injectable()
export class ApartmentViewsService {
  constructor(private readonly photos: PhotosService) {}

  /** Each apartment with its cover photo. */
  async withCovers(apartments: Apartment[]) {
    const covers = await this.photos.apartmentCovers(apartments.map((apartment) => apartment.id));
    return apartments.map((apartment) => {
      const cover = covers.get(apartment.id);
      return presentApartment(apartment, cover ? presentPhoto(cover) : null);
    });
  }

  /** One apartment with all of its photos; the first one is the cover. */
  async withPhotos(apartment: Apartment) {
    const { items } = await this.photos.list({ apartmentId: apartment.id, limit: MAX_PHOTOS });
    const photos = items.map(presentPhoto);
    return presentApartment(apartment, photos[0] ?? null, photos);
  }
}
