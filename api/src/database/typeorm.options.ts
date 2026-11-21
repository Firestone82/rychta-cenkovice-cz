import type { DataSourceOptions } from 'typeorm';
import type { AppConfig } from '../config/app.config.js';
import { ENTITIES } from './entities.js';
import { MIGRATIONS } from './migrations/index.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

/** Shared by the application and the TypeORM command line (`data-source.ts`). */
export function typeOrmOptions(config: AppConfig): DataSourceOptions {
  return {
    type: 'postgres',
    url: config.database.url,
    ssl: config.database.ssl,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsRun: config.database.migrate,
    synchronize: false,
    namingStrategy: new SnakeNamingStrategy(),
  };
}
