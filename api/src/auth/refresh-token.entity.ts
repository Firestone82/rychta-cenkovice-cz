import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../users/user.entity.js';

/** One refresh token of a session. Only the SHA-256 hash of the token is stored. */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  /** All tokens of one sign-in share a family; reuse of an old token revokes the family. */
  @Index()
  @Column({ type: 'varchar', length: 32 })
  familyId: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /** The session cannot be extended past this moment, however often it is refreshed. */
  @Column({ type: 'timestamptz' })
  familyExpiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 300, default: '' })
  userAgent: string;

  @Column({ type: 'varchar', length: 64, default: '' })
  ip: string;
}
