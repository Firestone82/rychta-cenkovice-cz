import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { adminGuard, guestGuard } from '../core/auth';
import { I18n } from '../core/i18n/i18n';

/** The administration has no language in its URL; it uses the one the administrator used last. */
const adminLang: ResolveFn<void> = () => {
  const i18n = inject(I18n);
  return i18n.use(i18n.preferred());
};

export const adminRoutes: Routes = [
  {
    path: '',
    resolve: { lang: adminLang },
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./login').then((m) => m.LoginPage),
      },
      {
        path: '',
        canActivate: [adminGuard],
        loadComponent: () => import('./admin-shell').then((m) => m.AdminShell),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./dashboard').then((m) => m.DashboardPage),
          },
          {
            path: 'calendar',
            loadComponent: () => import('./calendar').then((m) => m.CalendarPage),
          },
          {
            path: 'bookings',
            loadComponent: () => import('./bookings').then((m) => m.BookingsPage),
          },
          {
            path: 'bookings/new',
            loadComponent: () => import('./booking-form').then((m) => m.BookingFormPage),
          },
          {
            path: 'bookings/:id',
            loadComponent: () => import('./booking-form').then((m) => m.BookingFormPage),
          },
          {
            path: 'messages',
            loadComponent: () => import('./messages').then((m) => m.MessagesPage),
          },
          {
            path: 'apartments',
            loadComponent: () => import('./apartments').then((m) => m.ApartmentsPage),
          },
          { path: 'photos', loadComponent: () => import('./photos').then((m) => m.PhotosPage) },
          { path: 'news', loadComponent: () => import('./news').then((m) => m.NewsAdminPage) },
          { path: 'account', loadComponent: () => import('./account').then((m) => m.AccountPage) },
          { path: '**', redirectTo: '' },
        ],
      },
    ],
  },
];
