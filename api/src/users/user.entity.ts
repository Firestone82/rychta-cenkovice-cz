import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('identity')
  id: number;

  /** Always lower case, so the unique index also covers "Admin@..." and "admin@...". */
  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text' })
  passwordHash: string;

  /** One of `USER_ROLES`. */
  @Column({ type: 'varchar', length: 20, default: 'admin' })
  role: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /** The last sign-in with the password; null for an account that never signed in. */
  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;
}
