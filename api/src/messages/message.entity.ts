import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const MESSAGE_STATUSES = ['new', 'read', 'archived'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/** A message sent through the contact form. */
@Entity('messages')
@Check('messages_status_check', `"status" IN ('new', 'read', 'archived')`)
export class Message {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 40, default: '' })
  phone: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 2, default: 'cs' })
  language: string;

  @Index()
  @Column({ type: 'varchar', length: 10, default: 'new' })
  status: MessageStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
