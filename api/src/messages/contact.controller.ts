import { Body, Controller, HttpCode, HttpStatus, Post, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type FieldErrors, validationFailed } from '../common/api-error.js';
import { ClientIp } from '../common/client-ip.decorator.js';
import { type AppConfig, InjectConfig } from '../config/app.config.js';
import { CaptchaService } from '../forms/captcha.service.js';
import { PublicFormInterceptor } from '../forms/public-form.interceptor.js';
import { MailService } from '../mail/mail.service.js';
import { contactMail } from './contact-mail.js';
import { type ContactInput, contactSchema } from './messages.schemas.js';
import { MessagesService } from './messages.service.js';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(
    private readonly messages: MessagesService,
    private readonly captcha: CaptchaService,
    private readonly mail: MailService,
    @InjectConfig() private readonly config: AppConfig,
  ) {}

  /** Stores a message from the contact form and tells the owner by e-mail. */
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseInterceptors(PublicFormInterceptor)
  async send(
    @Body({ schema: contactSchema }) body: ContactInput,
    @ClientIp() ip: string,
  ): Promise<void> {
    const fields: FieldErrors = {};
    this.captcha.requireToken(body.captcha_token, fields);
    if (Object.keys(fields).length > 0) throw validationFailed(fields);
    await this.captcha.assertPassed(body.captcha_token, ip);

    const message = await this.messages.create({
      name: body.name,
      email: body.email,
      phone: body.phone,
      body: body.message,
      language: body.language,
    });
    this.mail.send(contactMail(message, this.config.mail.to, this.config.publicUrl));
  }
}
