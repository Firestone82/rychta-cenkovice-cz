import type { Apartment } from '../apartments/apartment.entity.js';

const KITCHEN = { cs: 'plně vybavený kuchyňský kout', en: 'fully equipped kitchenette' };
const BATHROOM = {
  cs: 'samostatná koupelna se dvěma umyvadly, sprchovým koutem a WC',
  en: 'separate bathroom with two washbasins, a shower and a toilet',
};
const CONNECTING = {
  cs: 'Apartmány 4 a 5 lze propojit. Každý má ve své části dveře, které si host může odemknout.',
  en: 'Apartments 4 and 5 can be connected. Each has a door on its own side that guests can unlock.',
};
const CONNECT_LABEL = [{ cs: 'Lze propojit', en: 'Can be connected' }];

/** What the original website lists for every kitchenette and bathroom. */
const BASE_AMENITIES = [
  'kitchenette',
  'fridge',
  'dishwasher',
  'microwave',
  'hob',
  'oven',
  'kettle',
  'bathroom',
  'shower',
  'dining-area',
];
const FULL_AMENITIES = [...BASE_AMENITIES, 'tv', 'sofa', 'entrance-hall'];

/** The usual rooms of an apartment; `living` describes the living room in both languages. */
const rooms = (living: { cs: string; en: string }) => ({
  cs: ['vstupní chodbička', BATHROOM.cs, living.cs, KITCHEN.cs, 'jídelní kout'],
  en: ['entrance hall', BATHROOM.en, living.en, KITCHEN.en, 'dining area'],
});

const TWO_DOUBLES = {
  cs: 'obývací pokoj se dvěma dvoulůžky, sedačkou a TV',
  en: 'living room with two double beds, a sofa and a TV',
};

/** The six apartments as the original rychtacenkovice.cz describes them. Prices were never published. */
export const APARTMENTS: Partial<Apartment>[] = [
  {
    slug: 'apartman-1',
    number: 1,
    floor: 3,
    area: 40,
    beds: 4,
    amenities: FULL_AMENITIES,
    layout: { cs: 'dvoulůžko + dvoulůžko', en: 'two double beds' },
    features: rooms(TWO_DOUBLES),
  },
  {
    slug: 'apartman-2',
    number: 2,
    floor: 3,
    area: 50,
    beds: 6,
    amenities: FULL_AMENITIES,
    layout: {
      cs: 'dvoulůžko + dvě samostatná lůžka + samostatné lůžko rozložitelné na dvoulůžko',
      en: 'a double bed + two single beds + a single bed that folds out into a double',
    },
    features: rooms({
      cs: 'obývací pokoj se sedačkou a TV',
      en: 'living room with a sofa and a TV',
    }),
  },
  {
    slug: 'apartman-3',
    number: 3,
    floor: 2,
    area: 92,
    beds: 9,
    flatType: '3+1',
    amenities: FULL_AMENITIES,
    layout: {
      cs: 'dvoulůžko v samostatné ložnici + dvoulůžko v obývacím pokoji + dětský pokoj se dvěma patrovými postelemi a jedním samostatným lůžkem',
      en: "a double bed in a separate bedroom + a double bed in the living room + a children's room with two bunk beds and one single bed",
    },
    features: rooms({
      cs: 'obývací pokoj se dvěma sedacími soupravami a TV',
      en: 'living room with two sofa sets and a TV',
    }),
  },
  {
    slug: 'apartman-4',
    number: 4,
    floor: 2,
    area: 30,
    beds: 3,
    flatType: '1+1',
    amenities: BASE_AMENITIES,
    labels: CONNECT_LABEL,
    layout: { cs: 'dvoulůžko + jednolůžko', en: 'a double bed + a single bed' },
    features: {
      cs: [
        'samostatná ložnice se třemi lůžky',
        'samostatná koupelna s umyvadlem, sprchovým koutem a WC',
        KITCHEN.cs,
        'jídelní kout',
      ],
      en: [
        'separate bedroom with three beds',
        'separate bathroom with a washbasin, a shower and a toilet',
        KITCHEN.en,
        'dining area',
      ],
    },
    note: CONNECTING,
  },
  {
    slug: 'apartman-5',
    number: 5,
    floor: 2,
    area: 72,
    beds: 6,
    extraBeds: 3,
    flatType: '3+1',
    amenities: FULL_AMENITIES,
    labels: CONNECT_LABEL,
    layout: {
      cs: 'dvoulůžko v samostatné ložnici + dvoulůžko a dvě rozkládací sedací soupravy v obývacím pokoji + dětský pokoj s patrovou postelí a rozkládacím futonem',
      en: "a double bed in a separate bedroom + a double bed and two sofa beds in the living room + a children's room with a bunk bed and a fold-out futon",
    },
    features: rooms(TWO_DOUBLES),
    note: CONNECTING,
  },
  {
    slug: 'apartman-6',
    number: 6,
    floor: 1,
    area: 55,
    beds: 6,
    accessible: true,
    flatType: '2+1',
    amenities: FULL_AMENITIES,
    layout: {
      cs: 'dvoulůžko + samostatné lůžko + patrová postel + samostatné lůžko v obývacím pokoji',
      en: 'a double bed + a single bed + a bunk bed + a single bed in the living room',
    },
    features: rooms(TWO_DOUBLES),
  },
];
