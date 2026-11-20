import { inject, Type } from '@angular/core';
import { ResolveFn, Route, Routes } from '@angular/router';
import { SITE } from './config/site.config';
import type { Lang } from './models/i18n.model';
import type { PageKey } from './models/site.model';
import { I18nService } from './services/i18n.service';

const PAGE_COMPONENTS: Record<PageKey, () => Promise<Type<unknown>>> = {
  home: () => import('./pages/home/home.page').then((m) => m.HomePage),
  accommodation: () =>
    import('./pages/accommodation/accommodation.page').then((m) => m.AccommodationPage),
  commonRoom: () => import('./pages/space/space.page').then((m) => m.SpacePage),
  facilities: () => import('./pages/space/space.page').then((m) => m.SpacePage),
  wellness: () => import('./pages/space/space.page').then((m) => m.SpacePage),
  apartment: () => import('./pages/apartment/apartment.page').then((m) => m.ApartmentPage),
  leisure: () => import('./pages/leisure/leisure.page').then((m) => m.LeisurePage),
  gallery: () => import('./pages/gallery/gallery.page').then((m) => m.GalleryPage),
  availability: () =>
    import('./pages/availability/availability.page').then((m) => m.AvailabilityPage),
  booking: () => import('./pages/booking/booking.page').then((m) => m.BookingPage),
  contact: () => import('./pages/contact/contact.page').then((m) => m.ContactPage),
  news: () => import('./pages/news/news.page').then((m) => m.NewsPage),
  privacy: () => import('./pages/privacy/privacy.page').then((m) => m.PrivacyPage),
};

const useLang =
  (lang: Lang): ResolveFn<void> =>
  () =>
    inject(I18nService).use(lang);

const SPACE_PAGES: PageKey[] = ['commonRoom', 'facilities', 'wellness'];

/**
 * `data.page` lets the language switch find the same page in another language;
 * `data.space` is bound to the input of the space page, which serves three routes.
 */
function pageRoutes(lang: Lang): Routes {
  const pages = (Object.keys(PAGE_COMPONENTS) as PageKey[]).map((page): Route => {
    const path = SITE.routes[page][lang];
    return {
      path,
      ...(path === '' ? { pathMatch: 'full' as const } : {}),
      data: SPACE_PAGES.includes(page) ? { page, space: page } : { page },
      loadComponent: PAGE_COMPONENTS[page],
    };
  });
  return [
    ...pages,
    {
      path: '**',
      data: { page: 'home' },
      loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
    },
  ];
}

const languageRoutes: Routes = SITE.languages.map(({ code }) => ({
  path: code,
  loadComponent: () => import('./layout/site/site.layout').then((m) => m.SiteLayout),
  resolve: { lang: useLang(code) },
  children: pageRoutes(code),
}));

const legacyRedirects: Routes = Object.entries(SITE.legacyRedirects).map(([path, redirectTo]) => ({
  path,
  redirectTo,
}));

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: () => '/' + inject(I18nService).preferred() },
  ...languageRoutes,
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.adminRoutes),
  },
  ...legacyRedirects,
  { path: '**', redirectTo: () => '/' + inject(I18nService).preferred() + '/404' },
];
