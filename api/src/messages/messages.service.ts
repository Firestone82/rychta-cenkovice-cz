import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { notFound } from '../common/api-error.js';
import { timestamp } from '../common/dates.util.js';
import { Message, type MessageStatus } from './message.entity.js';

const MAX_ITEMS = 500;

/** A message together with the booking that was created from it, if any. */
export interface MessageView {
  id: number;
  name: string;
  email: string;
  phone: string;
  body: string;
  language: string;
  status: MessageStatus;
  created_at: string;
  booking_id: number | null;
}

@Injectable()
export class MessagesService {
  constructor(@InjectRepository(Message) private readonly messages: Repository<Message>) {}

  create(
    message: Pick<Message, 'name' | 'email' | 'phone' | 'body' | 'language'>,
  ): Promise<Message> {
    return this.messages.save(this.messages.create(message));
  }

  /** Newest first. An empty status lists everything but the archive, `all` everything. */
  async list(status: string): Promise<MessageView[]> {
    const query = this.withBooking()
      .orderBy({ 'message.createdAt': 'DESC', 'message.id': 'DESC' })
      .take(MAX_ITEMS);
    if (status === '') query.where({ status: Not('archived') });
    else if (status !== 'all') query.where({ status });
    return this.views(await query.getRawAndEntities());
  }

  async findById(id: number): Promise<MessageView> {
    const [view] = this.views(await this.withBooking().where({ id }).getRawAndEntities());
    if (!view) throw notFound();
    return view;
  }

  exists(id: number): Promise<boolean> {
    return this.messages.existsBy({ id });
  }

  countNew(): Promise<number> {
    return this.messages.countBy({ status: 'new' });
  }

  async setStatus(id: number, status: MessageStatus): Promise<void> {
    const { affected } = await this.messages.update(id, { status });
    if (!affected) throw notFound();
  }

  async remove(id: number): Promise<void> {
    await this.messages.delete(id);
  }

  private withBooking() {
    return this.messages
      .createQueryBuilder('message')
      .addSelect(
        '(SELECT b.id FROM bookings b WHERE b.message_id = message.id ORDER BY b.id DESC LIMIT 1)',
        'booking_id',
      );
  }

  private views({
    entities,
    raw,
  }: {
    entities: Message[];
    raw: { booking_id: number | null }[];
  }): MessageView[] {
    return entities.map((message, index) => ({
      id: message.id,
      name: message.name,
      email: message.email,
      phone: message.phone,
      body: message.body,
      language: message.language,
      status: message.status,
      created_at: timestamp(message.createdAt),
      booking_id: raw[index].booking_id,
    }));
  }
}
