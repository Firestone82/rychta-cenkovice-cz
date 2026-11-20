import type { Apartment, L10n } from '@models/api.model';
import type { Amenity } from '@models/apartment-options.model';
import type { Lang } from '@models/i18n.model';

/** Texts of an apartment in one language, as typed into the editor. */
export interface ApartmentTexts {
  description: string;
  layout: string;
  /** One room or feature per line. */
  features: string;
  note: string;
}

/** Form state of the apartment editor; numbers stay strings until saved. */
export interface ApartmentDraft {
  price: string;
  minNights: string;
  beds: string;
  extraBeds: string;
  area: string;
  flatType: string;
  floor: string;
  active: boolean;
  accessible: boolean;
  amenities: Amenity[];
  labels: L10n[];
  texts: Record<'cs' | 'en', ApartmentTexts>;
}

export const MAX_LABELS = 8;

function texts(a: Apartment, lang: Lang & ('cs' | 'en')): ApartmentTexts {
  return {
    description: a.description?.[lang] ?? '',
    layout: a.layout[lang],
    features: a.features[lang].join('\n'),
    note: a.note[lang],
  };
}

export function toDraft(a: Apartment): ApartmentDraft {
  return {
    price: a.price_per_night !== null ? String(a.price_per_night) : '',
    minNights: String(a.min_nights),
    beds: String(a.beds),
    extraBeds: String(a.extra_beds),
    area: String(a.area),
    flatType: a.flat_type ?? '',
    floor: String(a.floor),
    active: a.active,
    accessible: a.accessible,
    amenities: [...(a.amenities ?? [])],
    labels: (a.labels ?? []).map((l) => ({ ...l })),
    texts: { cs: texts(a, 'cs'), en: texts(a, 'en') },
  };
}

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** Body of `PATCH /admin/apartments/:id`. An empty price is sent as `clear_price`. */
export function toApartmentUpdate(d: ApartmentDraft): Record<string, unknown> {
  const both = (key: keyof ApartmentTexts): L10n => ({ cs: d.texts.cs[key], en: d.texts.en[key] });
  const body: Record<string, unknown> = {
    min_nights: Number(d.minNights) || 1,
    beds: Number(d.beds),
    extra_beds: Number(d.extraBeds) || 0,
    area: Number(d.area),
    active: d.active,
    accessible: d.accessible,
    flat_type: d.flatType,
    floor: Number(d.floor),
    amenities: d.amenities,
    labels: d.labels.filter((l) => l.cs.trim() || l.en.trim()),
    layout: both('layout'),
    features: { cs: lines(d.texts.cs.features), en: lines(d.texts.en.features) },
    note: both('note'),
    description: both('description'),
  };
  if (d.price.trim() === '') body['clear_price'] = true;
  else body['price_per_night'] = Math.max(0, Math.round(Number(d.price)));
  return body;
}
