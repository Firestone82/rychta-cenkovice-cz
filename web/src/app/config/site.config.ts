import site from '@content/site.json';
import type { SiteContent } from '@models/site.model';

/** content/site.json; its shape is verified by config/content.spec.ts. */
export const SITE = site as SiteContent;
