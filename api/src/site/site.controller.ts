import { Controller, Get, Header, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { ApiError } from '../common/api-error.js';
import { CaptchaService } from '../forms/captcha.service.js';

@ApiTags('site')
@Controller()
export class SiteController {
  constructor(
    private readonly captcha: CaptchaService,
    private readonly dataSource: DataSource,
  ) {}

  /** Settings the website needs before it shows a form. */
  @Get('config')
  @Header('Cache-Control', 'public, max-age=300')
  config() {
    return { hcaptcha_sitekey: this.captcha.siteKey };
  }

  @Get('health')
  async health() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'unavailable',
        'Database is not reachable.',
      );
    }
    return { status: 'ok' };
  }
}
