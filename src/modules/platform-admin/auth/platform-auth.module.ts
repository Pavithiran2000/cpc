import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformActivityLog, PlatformAdmin, PlatformAdminRefreshToken } from '../../../database/entities';
import { EmailModule } from '../../email/email.module';
import { PlatformAlertsModule } from '../alerts/platform-alerts.module';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformRefreshTokenService } from './platform-refresh-token.service';
import { PlatformJwtStrategy } from './strategies/platform-jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformAdmin, PlatformAdminRefreshToken, PlatformActivityLog]),
    JwtModule.register({}),
    EmailModule,
    PlatformAlertsModule,
  ],
  controllers: [PlatformAuthController],
  providers: [PlatformAuthService, PlatformRefreshTokenService, PlatformJwtStrategy],
  exports: [PlatformAuthService],
})
export class PlatformAuthModule {}
