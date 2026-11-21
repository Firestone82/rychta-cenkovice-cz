import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminUsersController } from './admin-users.controller.js';
import { UsersModule } from './users.module.js';

/** Separate from `UsersModule`, which the authentication itself depends on. */
@Module({ imports: [UsersModule, AuthModule], controllers: [AdminUsersController] })
export class UsersAdminModule {}
