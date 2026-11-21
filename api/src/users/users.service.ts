import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { type FieldErrors, notFound, validationFailed } from '../common/api-error.js';
import { MIN_PASSWORD_LENGTH, PasswordService } from './password.service.js';
import { User } from './user.entity.js';
import type { UserRole } from './user-role.js';

export interface UserInput {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

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

  async signedIn(id: number): Promise<void> {
    await this.users.update(id, { lastLoginAt: new Date() });
  }

  list(): Promise<User[]> {
    return this.users.find({ order: { createdAt: 'ASC', id: 'ASC' } });
  }

  async create(input: UserInput): Promise<User> {
    await this.check(input, null);
    return this.users.save(
      this.users.create({
        name: input.name,
        email: input.email.toLowerCase(),
        role: input.role,
        passwordHash: await this.passwords.hash(input.password),
      }),
    );
  }

  /** Only the given fields change; a password is replaced when one is sent. */
  async update(id: number, changes: Partial<UserInput>): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw notFound();
    await this.check(changes, id);
    user.name = changes.name ?? user.name;
    user.email = changes.email?.toLowerCase() ?? user.email;
    user.role = changes.role ?? user.role;
    if (changes.password !== undefined) {
      user.passwordHash = await this.passwords.hash(changes.password);
    }
    return this.users.save(user);
  }

  async remove(id: number): Promise<void> {
    const { affected } = await this.users.delete(id);
    if (!affected) throw notFound();
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

  /** Throws 422 when the e-mail belongs to another account or the password is too short. */
  private async check(input: Partial<UserInput>, ownId: number | null): Promise<void> {
    const fields: FieldErrors = {};
    if (input.email !== undefined) {
      const taken = await this.users.existsBy({
        email: input.email.toLowerCase(),
        ...(ownId !== null && { id: Not(ownId) }),
      });
      if (taken) fields['email'] = 'taken';
    }
    if (input.password !== undefined && !this.passwords.acceptable(input.password)) {
      fields['password'] = 'too_short';
    }
    if (Object.keys(fields).length > 0) throw validationFailed(fields);
  }
}
