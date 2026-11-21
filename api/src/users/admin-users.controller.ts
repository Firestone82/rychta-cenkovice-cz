import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { SessionUser } from '../auth/access-token.service.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionService } from '../auth/session.service.js';
import { ApiError, validationFailed } from '../common/api-error.js';
import { IdPipe } from '../common/id.pipe.js';
import { presentUser } from './user.presenter.js';
import {
  type UserCreate,
  userCreateSchema,
  type UserUpdate,
  userUpdateSchema,
} from './users.schemas.js';
import { UsersService } from './users.service.js';

/** Accounts of the administration, managed by administrators only. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionService,
  ) {}

  @Get()
  async list() {
    return { items: (await this.users.list()).map(presentUser) };
  }

  @Post()
  async create(@Body({ schema: userCreateSchema }) body: UserCreate) {
    return presentUser(await this.users.create(body));
  }

  /**
   * Nobody changes their own role, so an administrator always remains. A new password or
   * role signs the account out everywhere; its own password is changed on the account page.
   */
  @Patch(':id')
  async update(
    @Param('id', IdPipe) id: number,
    @Body({ schema: userUpdateSchema }) body: UserUpdate,
    @CurrentUser() current: SessionUser,
  ) {
    if (id === current.id && body.role !== undefined && body.role !== current.role) {
      throw validationFailed({ role: 'own_account' });
    }
    if (id === current.id && body.password !== undefined) {
      throw validationFailed({ password: 'own_account' });
    }
    const before = await this.users.findById(id);
    const user = await this.users.update(id, body);
    if (body.password !== undefined || user.role !== before?.role) {
      await this.sessions.revokeUser(id);
    }
    return presentUser(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', IdPipe) id: number,
    @CurrentUser() current: SessionUser,
  ): Promise<void> {
    if (id === current.id) {
      throw new ApiError(HttpStatus.CONFLICT, 'own_account', 'You cannot delete your own account.');
    }
    await this.users.remove(id);
  }
}
