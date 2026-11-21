import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { type AppConfig, InjectConfig } from '../config/app.config.js';

/** A plain-text e-mail. */
export interface Mail {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
}

/**
 * Sends e-mails over SMTP. Without `RC_SMTP_HOST` it writes them to the outbox folder instead,
 * which is handy during development.
 */
@Injectable()
export class MailService implements OnApplicationShutdown {
  private readonly logger = new Logger('Mail');
  private readonly transport: Transporter | null;
  private readonly pending = new Set<Promise<void>>();

  constructor(@InjectConfig() private readonly config: AppConfig) {
    const { host, port, username, password, tls } = config.mail.smtp;
    this.transport = host
      ? createTransport({
          host,
          port,
          secure: tls === 'tls',
          requireTLS: tls === 'starttls',
          ignoreTLS: tls === 'none',
          auth: username ? { user: username, pass: password } : undefined,
          connectionTimeout: 15_000,
          socketTimeout: 45_000,
        })
      : null;
    if (!this.transport && config.env !== 'test') {
      this.logger.warn(
        'RC_SMTP_HOST not set: e-mails are written to the outbox folder instead of being sent',
      );
    }
  }

  /** Delivers in the background: a failing mail server must never fail the request itself. */
  send(mail: Mail): void {
    const delivery = this.deliver(mail)
      .catch((error: unknown) =>
        this.logger.error(`Delivery to ${mail.to} failed: ${String(error)}`),
      )
      .finally(() => this.pending.delete(delivery));
    this.pending.add(delivery);
  }

  /** Resolves once every e-mail handed to `send` has been dealt with. */
  async idle(): Promise<void> {
    await Promise.all(this.pending);
  }

  onApplicationShutdown(): Promise<void> {
    return this.idle();
  }

  private async deliver(mail: Mail): Promise<void> {
    if (!this.transport) return this.writeToOutbox(mail);
    await this.transport.sendMail({ from: this.config.mail.from, ...mail });
  }

  private async writeToOutbox(mail: Mail): Promise<void> {
    const dir = this.config.outboxDir;
    if (!dir) return;
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    const name = `${stamp}-${randomBytes(4).toString('hex')}.txt`;
    const content = `To: ${mail.to}\nReply-To: ${mail.replyTo ?? ''}\nSubject: ${mail.subject}\n\n${mail.text}\n`;
    await writeFile(join(dir, name), content, { mode: 0o640 });
  }
}
