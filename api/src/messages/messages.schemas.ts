import { z } from 'zod';
import { email, language, PHONE, text } from '../common/schemas.js';
import { MESSAGE_STATUSES } from './message.entity.js';

export const contactSchema = z.object({
  name: text('required').min(1, 'required').max(120, 'too_long'),
  email: email(),
  phone: z.union([z.literal(''), text().regex(PHONE, 'invalid')], 'invalid').default(''),
  message: text('required').min(1, 'required').max(4000, 'too_long'),
  consent: z.literal(true, 'required'),
  language,
  captcha_token: z.string().default(''),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const messageStatusSchema = z.object({ status: z.enum(MESSAGE_STATUSES, 'invalid') });
export type MessageStatusInput = z.infer<typeof messageStatusSchema>;

/** Empty lists everything but the archive, `all` everything, otherwise one status. */
export const messageListQuerySchema = z.object({ status: z.string().default('') });
export type MessageListQuery = z.infer<typeof messageListQuerySchema>;
