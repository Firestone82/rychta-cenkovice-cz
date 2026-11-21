import { z } from 'zod';
import { text } from '../common/schemas.js';

/** The Czech text is mandatory; without an English one the website shows the Czech. */
export const newsSchema = z
  .object({
    title: z.object({ cs: text().default(''), en: text().default('') }).default({ cs: '', en: '' }),
    body: z.object({ cs: text().default(''), en: text().default('') }).default({ cs: '', en: '' }),
    published: z.boolean().default(false),
    /** Empty means today. */
    published_at: z.union([z.literal(''), z.iso.date('invalid')], 'invalid').default(''),
  })
  .superRefine((value, ctx) => {
    if (value.title.cs === '' || value.title.cs.length > 200) {
      ctx.addIssue({ code: 'custom', path: ['title_cs'], message: 'required' });
    }
    if (value.body.cs === '' || value.body.cs.length > 20_000) {
      ctx.addIssue({ code: 'custom', path: ['body_cs'], message: 'required' });
    }
  });

export type NewsInput = z.infer<typeof newsSchema>;
