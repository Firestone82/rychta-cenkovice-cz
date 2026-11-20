import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { adminGuard, guestGuard } from '@guards/auth.guard';
import { I18nService } from '@services/i18n.service';

/** The administration has no language in its URL; it uses the one the administrator used last. */
const adminLang: ResolveFn<void> = () => {
  const i18n = inject(I18nService);
  return i18n.use(i18n.adminPreferred());
};

export const adminRoutes: Routes = [
  {
    path: '',
    resolve: { lang: adminLang },
    children: [
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
      },
      {
        path: '',
        canActivate: [adminGuard],
        loadComponent: () => import('@layout/admin/admin.layout').then((m) => m.AdminLayout),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
          },
          {
            path: 'calendar',
            loadComponent: () => import('./calendar/calendar.page').then((m) => m.CalendarPage),
          },
          {
            path: 'bookings',
            loadComponent: () => import('./bookings/bookings.page').then((m) => m.BookingsPage),
          },
          {
            path: 'bookings/new',
            loadComponent: () =>
              import('./booking-form/booking-form.page').then((m) => m.BookingFormPage),
          },
          {
            path: 'bookings/:id',
            loadComponent: () =>
              import('./booking-form/booking-form.page').then((m) => m.BookingFormPage),
          },
          {
            path: 'messages',
            loadComponent: () => import('./messages/messages.page').then((m) => m.MessagesPage),
          },
          {
            path: 'apartments',
            loadComponent: () =>
              import('./apartments/apartments.page').then((m) => m.ApartmentsPage),
          },
          {
            path: 'photos',
            loadComponent: () => import('./photos/photos.page').then((m) => m.PhotosPage),
          },
          {
            path: 'news',
            loadComponent: () => import('./news/news.page').then((m) => m.NewsAdminPage),
          },
          {
            path: 'account',
            loadComponent: () => import('./account/account.page').then((m) => m.AccountPage),
          },
          { path: '**', redirectTo: '' },
        ],
      },
    ],
  },
];
