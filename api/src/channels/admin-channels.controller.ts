import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { IdPipe } from '../common/id.pipe.js';
import { type ChannelSave, channelSaveSchema } from './channels.schemas.js';
import { ChannelsService } from './channels.service.js';

/** Calendars of booking portals, managed by administrators only: their addresses are secrets. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('admin/channels')
export class AdminChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Get()
  async list() {
    return { items: await this.channels.list() };
  }

  @Put()
  async save(@Body({ schema: channelSaveSchema }) body: ChannelSave) {
    return { channel: await this.channels.save(body) };
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  sync(@Param('id', IdPipe) id: number) {
    return this.channels.sync(id);
  }
}
