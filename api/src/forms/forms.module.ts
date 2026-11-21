import { Module } from '@nestjs/common';
import { CaptchaService } from './captcha.service.js';
import { PublicFormInterceptor } from './public-form.interceptor.js';
import { SubmissionLimiter } from './submission-limiter.service.js';

/** Protection shared by the public forms: honeypot, rate limit and hCaptcha. */
@Module({
  providers: [CaptchaService, SubmissionLimiter, PublicFormInterceptor],
  exports: [CaptchaService, SubmissionLimiter, PublicFormInterceptor],
})
export class FormsModule {}
