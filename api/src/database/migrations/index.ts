import type { MigrationInterface } from 'typeorm';
import { InitialSchema1795219008182 } from './1795219008182-InitialSchema.js';
import { DropNews1795260000000 } from './1795260000000-DropNews.js';

/** Every migration, oldest first. Add a new one here after generating it. */
export const MIGRATIONS: (new () => MigrationInterface)[] = [
  InitialSchema1795219008182,
  DropNews1795260000000,
];
