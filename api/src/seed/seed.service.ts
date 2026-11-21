import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ApartmentsService } from '../apartments/apartments.service.js';
import { PhotosService } from '../photos/photos.service.js';
import { APARTMENTS } from './apartments.seed.js';
import { altFor } from './photo-alt.js';
import manifest from './photos.json' with { type: 'json' };

interface ManifestPhoto {
  category: string;
  /** Apartment number for photos of the `apartment` category. */
  apartment: number | null;
  /** Path below the original website's `/userFiles`. */
  path: string;
}

/**
 * Fills an empty database with the apartments and the photo list taken over from the original
 * rychtacenkovice.cz. The photo files themselves come later, with `import-photos`.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly apartments: ApartmentsService,
    private readonly photos: PhotosService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if ((await this.apartments.count()) > 0) return;

    const idByNumber = new Map<number, number>();
    for (const apartment of APARTMENTS) {
      const { id, number } = await this.apartments.create({
        ...apartment,
        active: true,
        minNights: 1,
      });
      idByNumber.set(number, id);
    }

    const counters = new Map<string, number>();
    for (const [position, photo] of (manifest as ManifestPhoto[]).entries()) {
      const group = photo.apartment === null ? photo.category : `apartment-${photo.apartment}`;
      const index = (counters.get(group) ?? 0) + 1;
      counters.set(group, index);
      await this.photos.create({
        category: photo.category,
        apartmentId: photo.apartment === null ? null : (idByNumber.get(photo.apartment) ?? null),
        sourcePath: photo.path,
        alt: altFor(photo.category, photo.apartment, photo.path, index),
        sort: (position + 1) * 10,
      });
    }
    this.logger.log(`Seeded ${APARTMENTS.length} apartments and ${manifest.length} photo records`);
  }
}
