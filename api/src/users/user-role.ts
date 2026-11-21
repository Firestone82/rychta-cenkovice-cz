/**
 * `admin` may do everything. `staff` works with bookings and messages, but cannot change
 * apartments, photos or accounts.
 */
export const USER_ROLES = ['admin', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: string): value is UserRole =>
  (USER_ROLES as readonly string[]).includes(value);
