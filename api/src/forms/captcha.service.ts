import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiError, type FieldErrors, validationFailed } from '../common/api-error.js';
import { type AppConfig, InjectConfig } from '../config/app.config.js';

/** hCaptcha could not be reached or did not answer properly: neither accepted nor rejected. */
export class CaptchaUnavailableError extends Error {}

/** Error codes that point at our configuration, not at the visitor's answer. */
const CONFIGURATION_ERRORS = [
  'missing-input-secret',
  'invalid-input-secret',
  'sitekey-secret-mismatch',
];
const MAX_TOKEN_LENGTH = 8192;

/** Checks hCaptcha answers of the public forms. Switched off when no keys are configured. */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger('Captcha');

  constructor(@InjectConfig() private readonly config: AppConfig) {}

  get enabled(): boolean {
    return this.config.hcaptcha.secret !== '';
  }

  /** What the website needs to render the widget; empty when switched off. */
  get siteKey(): string {
    return this.enabled ? this.config.hcaptcha.siteKey : '';
  }

  /** Adds `captcha: required` when a form must carry an answer and has none. */
  requireToken(token: string, fields: FieldErrors): void {
    if (this.enabled && !token.trim()) fields['captcha'] = 'required';
  }

  /**
   * Throws unless the answer holds. An answer can be checked only once, so call this after
   * every other field is known to be valid.
   */
  async assertPassed(token: string, remoteIp: string): Promise<void> {
    if (!this.enabled) return;
    let passed: boolean;
    try {
      passed = await this.verify(token, remoteIp);
    } catch (error) {
      this.logger.error(`hCaptcha verification failed: ${String(error)}`);
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'captcha_unavailable',
        'The form protection could not be reached. Please try again in a moment.',
      );
    }
    if (!passed) throw validationFailed({ captcha: 'invalid' });
  }

  /** Whether `token` is a valid, unused answer. Throws `CaptchaUnavailableError` when unknown. */
  async verify(token: string, remoteIp = ''): Promise<boolean> {
    if (!this.enabled) return true;
    const answer = token.trim();
    if (!answer || answer.length > MAX_TOKEN_LENGTH) return false;

    const { secret, siteKey, verifyUrl } = this.config.hcaptcha;
    const form = new URLSearchParams({ secret, response: answer, sitekey: siteKey });
    if (remoteIp) form.set('remoteip', remoteIp);

    let result: { success?: boolean; 'error-codes'?: string[] };
    try {
      const res = await fetch(verifyUrl, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      result = (await res.json()) as typeof result;
    } catch (error) {
      throw new CaptchaUnavailableError(String(error), { cause: error });
    }
    const configuration = result['error-codes']?.find((code) =>
      CONFIGURATION_ERRORS.includes(code),
    );
    if (!result.success && configuration) throw new CaptchaUnavailableError(configuration);
    return result.success === true;
  }
}
