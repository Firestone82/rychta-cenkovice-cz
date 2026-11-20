/**
 * The fixed lists an apartment chooses from. The API validates against the same keys
 * (FlatTypes and Amenities in api/internal/store/store.go); their names are in the
 * translations under `flatTypes` and `amenities`.
 */
export const FLAT_TYPES = [
  'studio',
  '1+kk',
  '1+1',
  '2+kk',
  '2+1',
  '3+kk',
  '3+1',
  '4+kk',
  '4+1',
] as const;
export type FlatType = (typeof FLAT_TYPES)[number];

export const AMENITIES = [
  'kitchenette',
  'kitchen',
  'fridge',
  'dishwasher',
  'microwave',
  'hob',
  'oven',
  'kettle',
  'coffee-maker',
  'bathroom',
  'shower',
  'bathtub',
  'washing-machine',
  'hairdryer',
  'tv',
  'wifi',
  'sofa',
  'dining-area',
  'entrance-hall',
  'wardrobe',
  'balcony',
  'cot',
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const FLOORS = [1, 2, 3] as const;

/** Labels the owner can add with one click; any other label can be typed in. */
export const LABEL_PRESETS: { cs: string; en: string }[] = [
  { cs: 'Pro rodiny', en: 'Good for families' },
  { cs: 'Pro skupiny', en: 'Good for groups' },
  { cs: 'Pro páry', en: 'Good for couples' },
  { cs: 'Lze propojit', en: 'Can be connected' },
  { cs: 'Výhled na sjezdovku', en: 'View of the ski slope' },
  { cs: 'Nově zařízený', en: 'Newly furnished' },
  { cs: 'Domácí mazlíčci vítáni', en: 'Pets welcome' },
];
