import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeoCity, GeoDistrict, GeoProvince, PortalUser, PortalUserRefreshToken, Tenant, TenantRegistrationAttempt } from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { TenantsModule } from '../tenants/tenants.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RefreshTokenService } from './refresh-token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PortalUser, PortalUserRefreshToken, Tenant, TenantRegistrationAttempt, GeoProvince, GeoDistrict, GeoCity]),
    JwtModule.register({}),
    AuditModule,
    TenantsModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, JwtStrategy],
})
export class AuthModule {}
