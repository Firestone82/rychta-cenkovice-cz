import type { Photo } from './photo.entity.js';

/** A photo as the API returns it; the original's path stays internal. */
export const presentPhoto = (photo: Photo) => ({
  id: photo.id,
  category: photo.category,
  apartment_id: photo.apartmentId,
  file: photo.file,
  width: photo.width,
  height: photo.height,
  widths: photo.widths,
  color: photo.color,
  placeholder: photo.placeholder,
  alt: { cs: photo.alt.cs, en: photo.alt.en },
  sort: photo.sort,
});

export type PhotoView = ReturnType<typeof presentPhoto>;
