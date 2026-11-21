import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { IdPipe } from '../common/id.pipe.js';
import {
  type MessageListQuery,
  messageListQuerySchema,
  type MessageStatusInput,
  messageStatusSchema,
} from './messages.schemas.js';
import { MessagesService } from './messages.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('admin/messages')
export class AdminMessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  async list(@Query({ schema: messageListQuerySchema }) query: MessageListQuery) {
    return { items: await this.messages.list(query.status) };
  }

  @Patch(':id')
  async setStatus(
    @Param('id', IdPipe) id: number,
    @Body({ schema: messageStatusSchema }) body: MessageStatusInput,
  ) {
    await this.messages.setStatus(id, body.status);
    return this.messages.findById(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', IdPipe) id: number): Promise<void> {
    return this.messages.remove(id);
  }
}
