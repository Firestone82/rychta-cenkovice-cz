import type { MigrationInterface } from 'typeorm';
import { InitialSchema1795219008182 } from './1795219008182-InitialSchema.js';
import { DropNews1795260000000 } from './1795260000000-DropNews.js';
import { ApartmentName1795270000000 } from './1795270000000-ApartmentName.js';
import { Channels1795280000000 } from './1795280000000-Channels.js';

/** Every migration, oldest first. Add a new one here after generating it. */
export const MIGRATIONS: (new () => MigrationInterface)[] = [
  InitialSchema1795219008182,
  DropNews1795260000000,
  ApartmentName1795270000000,
  Channels1795280000000,
];
