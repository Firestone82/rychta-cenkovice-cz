import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { type AppConfig, InjectConfig } from '../config/app.config.js';
import { UsersService } from './users.service.js';

const DEFAULT_NAME = 'Administrátor';
const DEVELOPMENT_EMAIL = 'admin@rychtacenkovice.cz';

/** Makes sure the very first start has an account to sign in with. */
@Injectable()
export class AdminBootstrapService {
  private readonly logger = new Logger('Admin');

  constructor(
    private readonly users: UsersService,
    @InjectConfig() private readonly config: AppConfig,
  ) {}

  async run(): Promise<void> {
    if ((await this.users.count()) > 0) return;
    const { email, password } = this.config.admin;
    if (email && password) {
      await this.users.upsertAdmin(email, DEFAULT_NAME, password);
      this.logger.log(`Administrator created: ${email}`);
    } else if (this.config.production) {
      this.logger.warn(
        'No administrator exists: set RC_ADMIN_EMAIL and RC_ADMIN_PASSWORD, or run `npm run cli -- create-admin`',
      );
    } else {
      const generated = randomBytes(12).toString('base64url');
      await this.users.upsertAdmin(DEVELOPMENT_EMAIL, DEFAULT_NAME, generated);
      // Printed, not logged: the password is shown once and must not end up in a log file.
      console.log(
        `\n  Development administrator created\n  e-mail:   ${DEVELOPMENT_EMAIL}\n  password: ${generated}\n  (shown once; change it in the administration)\n`,
      );
    }
  }
}
