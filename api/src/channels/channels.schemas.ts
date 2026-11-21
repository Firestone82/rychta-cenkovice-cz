import { z } from 'zod';
import { text } from '../common/schemas.js';
import { CHANNEL_PROVIDERS } from './channel-connection.entity.js';

const isWebAddress = (value: string): boolean => {
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** An empty `import_url` disconnects the calendar and removes its upcoming blocks. */
export const channelSaveSchema = z.object({
  apartment_id: z.int('invalid').positive('invalid'),
  provider: z.enum(CHANNEL_PROVIDERS, 'invalid').default('echalupy'),
  import_url: text()
    .max(2000, 'too_long')
    .refine((value) => value === '' || isWebAddress(value), 'invalid'),
});
export type ChannelSave = z.infer<typeof channelSaveSchema>;
