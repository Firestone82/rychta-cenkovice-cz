/**
 * `admin` may do everything. `staff` works with bookings and messages, but cannot change
 * apartments, photos or accounts. `viewer` only reads the calendar and the bookings.
 */
export const USER_ROLES = ['admin', 'staff', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: string): value is UserRole =>
  (USER_ROLES as readonly string[]).includes(value);
