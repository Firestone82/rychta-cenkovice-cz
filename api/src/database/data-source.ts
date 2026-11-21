import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { loadConfig } from '../config/app.config.js';
import { typeOrmOptions } from './typeorm.options.js';

// The TypeORM command line runs outside Nest, so the .env file is read here.
for (const file of ['.env', '../.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

export default new DataSource({ ...typeOrmOptions(loadConfig(process.env)), migrationsRun: false });
