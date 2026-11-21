import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { FormsModule } from '../forms/forms.module.js';
import { MailModule } from '../mail/mail.module.js';
import { AdminMessagesController } from './admin-messages.controller.js';
import { ContactController } from './contact.controller.js';
import { Message } from './message.entity.js';
import { MessagesService } from './messages.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), AuthModule, FormsModule, MailModule],
  controllers: [ContactController, AdminMessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
