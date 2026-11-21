import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { type AppConfig, appConfig } from './config/app.config.js';
import { DemoSeedService } from './seed/demo-seed.service.js';
import { PhotoImportService } from './seed/photo-import.service.js';
import { UsersService } from './users/users.service.js';

const USAGE = `Usage: npm run cli -- <command>

  import-photos [--dir <folder>] [--replace]   build gallery sizes from the photos of the original website
  create-admin --email <address> [--name <n>]  create an administrator, or reset the password of one
  seed-demo                                    add example bookings and messages
`;

type Command = (app: INestApplicationContext, args: string[]) => Promise<void>;

const commands: Record<string, Command> = {
  async 'import-photos'(app, args) {
    const { values } = parseArgs({
      args,
      options: { dir: { type: 'string' }, replace: { type: 'boolean', default: false } },
    });
    const result = await app.get(PhotoImportService).run(values);
    console.log(
      `imported ${result.imported}, skipped ${result.skipped}, failed ${result.failed.length}`,
    );
    for (const path of result.failed) console.log(`  failed: ${path}`);
  },

  async 'create-admin'(app, args) {
    const { values } = parseArgs({
      args,
      options: { email: { type: 'string' }, name: { type: 'string', default: 'Administrátor' } },
    });
    if (!values.email) throw new Error('--email is required');
    let password = app.get<AppConfig>(appConfig.KEY).admin.password;
    if (!password) {
      const terminal = createInterface({ input: process.stdin, output: process.stdout });
      password = await terminal.question('Password (at least 12 characters): ');
      terminal.close();
    }
    const outcome = await app.get(UsersService).upsertAdmin(values.email, values.name, password);
    console.log(
      outcome === 'created'
        ? `administrator created: ${values.email}`
        : `password updated for ${values.email}`,
    );
  },

  async 'seed-demo'(app) {
    await app.get(DemoSeedService).run();
    console.log('example bookings and messages added');
  },
};

const [name = '', ...args] = process.argv.slice(2);
const command = commands[name];
if (!command) {
  console.error(USAGE);
  process.exit(1);
}

const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
try {
  await command(app, args);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}
