import { Module } from '@nestjs/common';
import { FormsModule } from '../forms/forms.module.js';
import { SiteController } from './site.controller.js';

@Module({ imports: [FormsModule], controllers: [SiteController] })
export class SiteModule {}
