import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiError, notFound } from '../common/api-error.js';
import { type AppConfig, InjectConfig } from '../config/app.config.js';
import type { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AccessTokenService, type SessionUser } from './access-token.service.js';
import {
  type Credentials,
  credentialsSchema,
  type PasswordChange,
  passwordChangeSchema,
} from './auth.schemas.js';
import { AuthService, type SignedIn } from './auth.service.js';
import { Client } from './client-info.decorator.js';
import { CurrentUser } from './current-user.decorator.js';
import { SameSiteGuard } from './same-site.guard.js';
import type { ClientInfo } from './session.service.js';

const REFRESH_COOKIE = 'rc_refresh';
/** The refresh cookie is only ever sent to the auth endpoints. */
const REFRESH_COOKIE_PATH = '/api/v1/auth';

const account = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly accessTokens: AccessTokenService,
    private readonly users: UsersService,
    @InjectConfig() private readonly config: AppConfig,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SameSiteGuard)
  async login(
    @Body({ schema: credentialsSchema }) body: Credentials,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.session(res, await this.auth.signIn(body.email, body.password, client));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SameSiteGuard)
  async refresh(
    @Req() req: Request,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.refreshToken(req);
    if (!token) throw new ApiError(HttpStatus.UNAUTHORIZED, 'no_session', 'Not signed in.');
    try {
      return await this.session(res, await this.auth.refresh(token, client));
    } catch (error) {
      // A session that is over must not keep its cookie; a refresh race keeps the successor.
      if (error instanceof ApiError && error.getStatus() === HttpStatus.UNAUTHORIZED) {
        this.clearRefreshCookie(res);
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SameSiteGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = this.refreshToken(req);
    if (token) await this.auth.signOut(token);
    this.clearRefreshCookie(res);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  async me(@CurrentUser() current: SessionUser) {
    const user = await this.users.findById(current.id);
    if (!user) throw notFound();
    return account(user);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  async changePassword(
    @Body({ schema: passwordChangeSchema }) body: PasswordChange,
    @CurrentUser() current: SessionUser,
    @Client() client: ClientInfo,
    @Res({ passthrough: true }) res: Response,
  ) {
    const signedIn = await this.auth.changePassword(
      current.id,
      body.current_password,
      body.new_password,
      client,
    );
    return this.session(res, signedIn);
  }

  /** Sets the refresh cookie and answers with a fresh access token. */
  private async session(res: Response, { user, refresh }: SignedIn) {
    res.cookie(REFRESH_COOKIE, refresh.token, {
      ...this.cookieOptions(),
      expires: refresh.expiresAt,
      maxAge: refresh.expiresAt.getTime() - Date.now(),
    });
    return {
      access_token: await this.accessTokens.issue(user),
      token_type: 'Bearer',
      expires_in: this.accessTokens.lifetimeSeconds,
      user: account(user),
    };
  }

  private refreshToken(req: Request): string {
    const value: unknown = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
    return typeof value === 'string' ? value : '';
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private cookieOptions() {
    return {
      path: REFRESH_COOKIE_PATH,
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'strict' as const,
    };
  }
}
