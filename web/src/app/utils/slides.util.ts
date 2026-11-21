import type { Photo } from '@models/api.model';
import type { Slide } from '@models/slide.model';
import type { ApiService } from '@services/api.service';
import type { I18nService } from '@services/i18n.service';

/** Photos from the API as lightbox slides, described in the current language. */
export function photoSlides(photos: Photo[], api: ApiService, i18n: I18nService): Slide[] {
  return photos.map((photo) => ({
    src: api.photoUrl(photo, photo.widths[photo.widths.length - 1]),
    srcset: api.srcset(photo),
    width: photo.width,
    height: photo.height,
    alt: i18n.pick(photo.alt),
    placeholder: photo.placeholder,
  }));
}
