import { z } from 'zod';
import { email, text } from '../common/schemas.js';
import { USER_ROLES } from './user-role.js';

export const userCreateSchema = z.object({
  name: text('required').min(1, 'required').max(120, 'too_long'),
  email: email(),
  role: z.enum(USER_ROLES, 'invalid'),
  /** Its length is checked by `PasswordService`, in characters. */
  password: z.string('too_short'),
});
export type UserCreate = z.infer<typeof userCreateSchema>;

/** Only the fields that are sent change. */
export const userUpdateSchema = userCreateSchema.partial();
export type UserUpdate = z.infer<typeof userUpdateSchema>;
