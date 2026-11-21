import type { PhotoView } from '../photos/photo.presenter.js';
import type { Apartment } from './apartment.entity.js';

const bothLanguages = <T>({ cs, en }: { cs: T; en: T }) => ({ cs, en });

/** `photos` is left out when there are none, as for the list where they are not loaded. */
export const presentApartment = (
  apartment: Apartment,
  cover: PhotoView | null,
  photos: PhotoView[] = [],
) => ({
  id: apartment.id,
  slug: apartment.slug,
  number: apartment.number,
  floor: apartment.floor,
  area: apartment.area,
  beds: apartment.beds,
  extra_beds: apartment.extraBeds,
  accessible: apartment.accessible,
  flat_type: apartment.flatType,
  amenities: apartment.amenities,
  labels: apartment.labels,
  layout: bothLanguages(apartment.layout),
  features: bothLanguages(apartment.features),
  note: bothLanguages(apartment.note),
  description: bothLanguages(apartment.description),
  price_per_night: apartment.pricePerNight,
  min_nights: apartment.minNights,
  active: apartment.active,
  cover,
  ...(photos.length > 0 && { photos }),
});
