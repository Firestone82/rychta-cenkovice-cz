import type { MigrationInterface } from 'typeorm';
import { InitialSchema1795219008182 } from './1795219008182-InitialSchema.js';

/** Every migration, oldest first. Add a new one here after generating it. */
export const MIGRATIONS: (new () => MigrationInterface)[] = [InitialSchema1795219008182];
