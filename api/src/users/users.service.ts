import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MIN_PASSWORD_LENGTH, PasswordService } from './password.service.js';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly passwords: PasswordService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: email.trim().toLowerCase() });
  }

  findById(id: number): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  count(): Promise<number> {
    return this.users.count();
  }

  async setPassword(id: number, password: string): Promise<void> {
    await this.users.update(id, { passwordHash: await this.passwords.hash(password) });
  }

  /** Creates the administrator, or only sets a new password when the account exists. */
  async upsertAdmin(email: string, name: string, password: string): Promise<'created' | 'updated'> {
    if (!this.passwords.acceptable(password)) {
      throw new Error(`The password must have at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    const existing = await this.findByEmail(email);
    if (existing) {
      await this.setPassword(existing.id, password);
      return 'updated';
    }
    await this.users.insert({
      email: email.trim().toLowerCase(),
      name,
      passwordHash: await this.passwords.hash(password),
    });
    return 'created';
  }
}
