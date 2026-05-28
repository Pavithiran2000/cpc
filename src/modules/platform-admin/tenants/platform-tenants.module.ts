import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformActivityLog, PortalUser, Tenant, TenantSetting } from '../../../database/entities';
import { TenantsModule } from '../../tenants/tenants.module';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformAlertsModule } from '../alerts/platform-alerts.module';
import { PlatformTenantsController } from './platform-tenants.controller';
import { PlatformTenantsService } from './platform-tenants.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantSetting, PortalUser, PlatformActivityLog]),
    TenantsModule,
    PlatformAlertsModule,
  ],
  controllers: [PlatformTenantsController],
  providers: [PlatformTenantsService, PlatformJwtGuard, PlatformRoleGuard],
})
export class PlatformTenantsModule {}
