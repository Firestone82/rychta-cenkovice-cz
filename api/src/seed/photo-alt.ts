import { basename } from 'node:path';

/** A fragment of the original file name and what the photo shows. The first match wins. */
const HINTS: [fragment: string, cs: string, en: string][] = [
  ['kuchyn-a-jidelna', 'Kuchyň a jídelna', 'Kitchen and dining area'],
  ['pohled-do-kuchyne', 'Pohled do kuchyně', 'View into the kitchen'],
  ['kuchyn', 'Kuchyňský kout', 'Kitchenette'],
  ['koupelna', 'Koupelna', 'Bathroom'],
  ['umyvadla', 'Umyvadla v koupelně', 'Bathroom washbasins'],
  ['loznice', 'Ložnice', 'Bedroom'],
  ['obyvak-a-spani', 'Obývací pokoj s lůžky', 'Living room with beds'],
  ['spani-obyvak', 'Lůžka v obývacím pokoji', 'Beds in the living room'],
  ['obyvak', 'Obývací pokoj', 'Living room'],
  ['detsky', 'Dětský pokoj', "Children's room"],
  ['jidelna', 'Jídelní kout', 'Dining area'],
  ['chodba', 'Chodba', 'Hallway'],
  ['spani', 'Lůžka', 'Beds'],
  ['sedacka', 'Sedačka', 'Sofa'],
  ['celkovy-pohled', 'Celkový pohled na apartmán', 'Overall view of the apartment'],
  ['uvodni', 'Pohled do apartmánu', 'View of the apartment'],
  ['sud-zima', 'Horký sud v zimě', 'Hot tub in winter'],
  ['sauna', 'Sauna', 'Sauna'],
  ['sud', 'Venkovní horký sud', 'Outdoor hot tub'],
  ['budova', 'Budova wellness', 'The wellness building'],
  ['terasa', 'Terasa', 'Terrace'],
  ['tereasa', 'Terasa', 'Terrace'],
  ['garazove', 'Kryté parkovací stání', 'Covered parking'],
  ['pergola', 'Pergola', 'Pergola'],
  ['trampolina', 'Trampolína', 'Trampoline'],
  ['lyzarna', 'Lyžárna', 'Ski room'],
  ['stoly', 'Stoly ve společenské místnosti', 'Tables in the common room'],
  ['kulabr', 'Kulečník', 'Billiards table'],
  ['neratov-strecha', 'Skleněná střecha kostela v Neratově', 'Glass roof of the church in Neratov'],
  ['neratov', 'Kostel v Neratově', 'Church in Neratov'],
  ['litomysl', 'Litomyšl', 'Litomyšl'],
  ['dolni-morava-stezka', 'Stezka v oblacích, Dolní Morava', 'Sky Walk, Dolní Morava'],
  ['dolni-morava', 'Dolní Morava', 'Dolní Morava'],
  ['zemska-brana', 'Zemská brána', 'Zemská brána'],
  ['krizova-hora', 'Křížová hora', 'Křížová hora'],
  ['jablonne', 'Jablonné nad Orlicí', 'Jablonné nad Orlicí'],
  ['castalovice', 'Častolovice', 'Častolovice'],
  ['zamberk', 'Zámecký park v Žamberku', 'Castle park in Žamberk'],
  ['muchomurky', 'Muchomůrky v lese', 'Fly agarics in the forest'],
  ['podzim-suchac', 'Podzim na Suchém vrchu', 'Autumn on Suchý vrch'],
  ['zima-suchac', 'Zima na Suchém vrchu', 'Winter on Suchý vrch'],
  ['bouda', 'Tvrz Bouda', 'Bouda fortress'],
  ['hurka', 'Tvrz Hůrka', 'Hůrka fortress'],
  ['zima-bukovka', 'Zima na Bukové hoře', 'Winter on Buková hora'],
  ['bukovka', 'Buková hora', 'Buková hora'],
  ['hedec', 'Klášter Hora Matky Boží', 'Hora Matky Boží monastery'],
  ['sjezdovky', 'Sjezdovky v Čenkovicích', 'Ski slopes in Čenkovice'],
  ['jizni-poprasek', 'Čerstvý sníh na jižních svazích', 'Fresh snow on the southern slopes'],
  [
    'cenkovice-pohled',
    'Čenkovice, pohled na jižní svahy',
    'Čenkovice, view of the southern slopes',
  ],
  ['bledule', 'Bledule', 'Spring snowflakes'],
  ['kravy', 'Krávy na podzimní pastvě', 'Cows on an autumn pasture'],
  ['jaro-pod-skalou', 'Jaro pod skálou', 'Spring below the rock'],
  ['louka', 'Louka', 'Meadow'],
  ['leto', 'Léto v Čenkovicích', 'Summer in Čenkovice'],
  ['svitava', 'Zimní svítání', 'Winter dawn'],
  ['zima', 'Zima v Čenkovicích', 'Winter in Čenkovice'],
];

const CATEGORY_LABELS: Record<string, { cs: string; en: string }> = {
  house: { cs: 'Rychta Čenkovice', en: 'Rychta Čenkovice' },
  surroundings: { cs: 'Okolí Rychty', en: 'Around the Rychta' },
  'common-room': { cs: 'Společenská místnost', en: 'Common room' },
  facilities: { cs: 'Zázemí objektu', en: 'Facilities' },
  wellness: { cs: 'Domácí wellness', en: 'Private wellness' },
  trips: { cs: 'Výlety v okolí', en: 'Trips nearby' },
  winter: { cs: 'Zima', en: 'Winter' },
  misc: { cs: 'Rychta Čenkovice', en: 'Rychta Čenkovice' },
};

/** Categories whose photos are described as "<place>: <what>" rather than by the subject alone. */
const PREFIXED = ['apartment', 'common-room', 'wellness', 'facilities'];

const lowerFirst = (value: string): string => value.charAt(0).toLowerCase() + value.slice(1);

/**
 * Builds a bilingual alt text for a photo of the original website from its file name.
 * `index` numbers the photos of one category (or apartment) for names that say nothing.
 */
export function altFor(
  category: string,
  apartment: number | null,
  sourcePath: string,
  index: number,
): { cs: string; en: string } {
  const base =
    category === 'apartment' && apartment !== null
      ? { cs: `Apartmán ${apartment}`, en: `Apartment ${apartment}` }
      : (CATEGORY_LABELS[category] ?? { cs: '', en: '' });
  const name = basename(sourcePath).toLowerCase();
  const hint = HINTS.find(([fragment]) => name.includes(fragment));
  if (!hint) return { cs: `${base.cs}, fotografie ${index}`, en: `${base.en}, photo ${index}` };
  const [, cs, en] = hint;
  return PREFIXED.includes(category)
    ? { cs: `${base.cs}: ${lowerFirst(cs)}`, en: `${base.en}: ${lowerFirst(en)}` }
    : { cs, en };
}
