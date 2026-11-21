import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { type AppConfig, appConfig } from '../config/app.config.js';
import { UsersModule } from '../users/users.module.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AdminGuard } from './admin.guard.js';
import { ACCESS_TOKEN_AUDIENCE, AccessTokenService } from './access-token.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RefreshToken } from './refresh-token.entity.js';
import { SameSiteGuard } from './same-site.guard.js';
import { SessionService } from './session.service.js';
import { StaffGuard } from './staff.guard.js';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      inject: [appConfig.KEY],
      useFactory: ({ jwt }: AppConfig) => ({
        secret: jwt.secret,
        signOptions: {
          algorithm: 'HS256',
          issuer: jwt.issuer,
          audience: ACCESS_TOKEN_AUDIENCE,
          expiresIn: Math.floor(jwt.accessTtl / 1000),
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: jwt.issuer,
          audience: ACCESS_TOKEN_AUDIENCE,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    AccessTokenService,
    AccessTokenGuard,
    AdminGuard,
    StaffGuard,
    SameSiteGuard,
  ],
  exports: [AccessTokenService, AccessTokenGuard, AdminGuard, StaffGuard, SessionService],
})
export class AuthModule {}
