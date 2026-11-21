import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBootstrapService } from './admin-bootstrap.service.js';
import { PasswordService } from './password.service.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, PasswordService, AdminBootstrapService],
  exports: [UsersService, PasswordService, AdminBootstrapService],
})
export class UsersModule {}
