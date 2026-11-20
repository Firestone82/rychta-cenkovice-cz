import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { I18n } from './core/i18n/i18n';
import type { Lang } from './core/i18n/types';
import { PAGES, PageKey } from './core/links';

const useLang =
  (lang: Lang): ResolveFn<void> =>
  () =>
    inject(I18n).use(lang);

/** The public pages, with localized URL segments. `data.page` lets the language switch find the twin page. */
function siteRoutes(lang: Lang): Routes {
  const path = (page: PageKey) => PAGES[page][lang];
  return [
    {
      path: '',
      pathMatch: 'full',
      data: { page: 'home' },
      loadComponent: () => import('./site/pages/home').then((m) => m.HomePage),
    },
    {
      path: path('accommodation'),
      data: { page: 'accommodation' },
      loadComponent: () => import('./site/pages/accommodation').then((m) => m.AccommodationPage),
    },
    {
      path: path('commonRoom'),
      data: { page: 'commonRoom', space: 'commonRoom' },
      loadComponent: () => import('./site/pages/space').then((m) => m.SpacePage),
    },
    {
      path: path('facilities'),
      data: { page: 'facilities', space: 'facilities' },
      loadComponent: () => import('./site/pages/space').then((m) => m.SpacePage),
    },
    {
      path: path('wellness'),
      data: { page: 'wellness', space: 'wellness' },
      loadComponent: () => import('./site/pages/space').then((m) => m.SpacePage),
    },
    {
      path: path('apartment'),
      data: { page: 'apartment' },
      loadComponent: () => import('./site/pages/apartment').then((m) => m.ApartmentPage),
    },
    {
      path: path('leisure'),
      data: { page: 'leisure' },
      loadComponent: () => import('./site/pages/leisure').then((m) => m.LeisurePage),
    },
    {
      path: path('gallery'),
      data: { page: 'gallery' },
      loadComponent: () => import('./site/pages/gallery').then((m) => m.GalleryPage),
    },
    {
      path: path('availability'),
      data: { page: 'availability' },
      loadComponent: () => import('./site/pages/availability').then((m) => m.AvailabilityPage),
    },
    {
      path: path('booking'),
      data: { page: 'booking' },
      loadComponent: () => import('./site/pages/booking').then((m) => m.BookingPage),
    },
    {
      path: path('contact'),
      data: { page: 'contact' },
      loadComponent: () => import('./site/pages/contact').then((m) => m.ContactPage),
    },
    {
      path: path('news'),
      data: { page: 'news' },
      loadComponent: () => import('./site/pages/news').then((m) => m.NewsPage),
    },
    {
      path: path('privacy'),
      data: { page: 'privacy' },
      loadComponent: () => import('./site/pages/privacy').then((m) => m.PrivacyPage),
    },
    {
      path: '**',
      data: { page: 'home' },
      loadComponent: () => import('./site/pages/not-found').then((m) => m.NotFoundPage),
    },
  ];
}

const shell = () => import('./site/shell').then((m) => m.SiteShell);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: () => '/' + inject(I18n).preferred() },
  {
    path: 'cs',
    loadComponent: shell,
    resolve: { lang: useLang('cs') },
    children: siteRoutes('cs'),
  },
  {
    path: 'en',
    loadComponent: shell,
    resolve: { lang: useLang('en') },
    children: siteRoutes('en'),
  },
  { path: 'admin', loadChildren: () => import('./admin/admin.routes').then((m) => m.adminRoutes) },

  // Addresses of the previous website keep working.
  { path: 'ubytovani/apartmany/:slug', redirectTo: 'cs/ubytovani/:slug' },
  { path: 'ubytovani/apartmany', redirectTo: 'cs/ubytovani' },
  { path: 'ubytovani/spolecenska-mistnost', redirectTo: 'cs/ubytovani/spolecenska-mistnost' },
  { path: 'ubytovani/zazemi-objektu', redirectTo: 'cs/ubytovani/zazemi-objektu' },
  { path: 'ubytovani/domaci-wellness', redirectTo: 'cs/ubytovani/domaci-wellness' },
  { path: 'ubytovani', redirectTo: 'cs/ubytovani' },
  { path: 'volny-cas/vylety-v-okoli', redirectTo: 'cs/volny-cas' },
  { path: 'volny-cas/resorty-pro-sporty-a-zabavu', redirectTo: 'cs/volny-cas' },
  { path: 'volny-cas', redirectTo: 'cs/volny-cas' },
  { path: 'fotogalerie-', redirectTo: 'cs/fotogalerie' },
  { path: 'fotogalerie', redirectTo: 'cs/fotogalerie' },
  { path: 'kalendar-obsazenosti', redirectTo: 'cs/obsazenost' },
  { path: 'kontakt', redirectTo: 'cs/kontakt' },
  { path: 'novinky', redirectTo: 'cs/novinky' },
  { path: 'zasady-ochrany-osobnich-udaju', redirectTo: 'cs/ochrana-osobnich-udaju' },

  { path: '**', redirectTo: () => '/' + inject(I18n).preferred() + '/404' },
];
