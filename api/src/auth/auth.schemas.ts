import { z } from 'zod';

// Malformed credentials are answered like wrong ones, so the shapes here never fail.
const lenient = z.string().catch('');

export const credentialsSchema = z.object({ email: lenient, password: lenient });
export type Credentials = z.infer<typeof credentialsSchema>;

export const passwordChangeSchema = z.object({ current_password: lenient, new_password: lenient });
export type PasswordChange = z.infer<typeof passwordChangeSchema>;
