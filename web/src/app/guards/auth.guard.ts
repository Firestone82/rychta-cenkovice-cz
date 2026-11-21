import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth.service';

export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (await auth.ensure()) return true;
  return router.createUrlTree(['/admin/login'], {
    queryParams: state.url && state.url !== '/admin' ? { next: state.url } : {},
  });
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.ensure()) ? router.createUrlTree(['/admin']) : true;
};

/** For pages only an administrator may open; runs after `adminGuard`, so the account is known. */
export const administratorGuard: CanActivateFn = () =>
  inject(AuthService).isAdmin() || inject(Router).createUrlTree(['/admin']);

/** For pages a read-only account may not open; it lands on the calendar instead. */
export const staffGuard: CanActivateFn = () =>
  inject(AuthService).canEdit() || inject(Router).createUrlTree(['/admin/calendar']);
