import { SITE } from '@config/site.config';
import type { Apartment } from '@models/api.model';
import type { Dict } from '@models/i18n.model';

/** The same identifier on every page, so search engines join the apartments to the house. */
export function businessId(origin: string): string {
  return `${origin}/#rychta`;
}

/** schema.org description of the house as a place to stay, put on every page of the website. */
export function lodgingBusiness(origin: string, home: string, t: Dict): object {
  const { contact, address } = SITE;
  const amenity = (name: string) => ({
    '@type': 'LocationFeatureSpecification',
    name,
    value: true,
  });
  return {
    '@type': 'LodgingBusiness',
    '@id': businessId(origin),
    name: t.meta.site,
    description: t.meta.description,
    url: origin + home,
    image: [`${origin}/img/og-image.jpg`, `${origin}/img/house-aerial-1920.webp`],
    logo: `${origin}/apple-touch-icon.png`,
    telephone: contact.phone.replace(/\s+/g, ''),
    email: contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      postalCode: address.postalCode,
      addressLocality: address.locality,
      addressRegion: address.region,
      addressCountry: address.country,
    },
    hasMap: contact.mapGoogle,
    sameAs: [contact.facebook],
    amenityFeature: [t.nav.commonRoom, t.nav.wellness, t.nav.facilities].map(amenity),
  };
}

/** schema.org description of one apartment, linked to the house. */
export function apartmentData(
  a: Apartment,
  page: { origin: string; url: string; name: string; description: string; images: string[] },
): object {
  return {
    '@type': 'Apartment',
    '@id': page.url,
    name: page.name,
    url: page.url,
    description: page.description,
    ...(page.images.length ? { image: page.images } : {}),
    ...(a.area
      ? { floorSize: { '@type': 'QuantitativeValue', value: a.area, unitCode: 'MTK' } }
      : {}),
    occupancy: { '@type': 'QuantitativeValue', minValue: 1, maxValue: a.beds + a.extra_beds },
    containedInPlace: { '@id': businessId(page.origin) },
  };
}

/** schema.org trail from the home page to the current one. */
export function breadcrumbs(items: { name: string; url: string }[]): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
