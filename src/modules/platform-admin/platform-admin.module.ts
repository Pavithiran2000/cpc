import { Module } from '@nestjs/common';
import { PlatformAuthModule } from './auth/platform-auth.module';
import { PlatformTenantsModule } from './tenants/platform-tenants.module';
import { PlatformAdminsModule } from './admins/platform-admins.module';
import { PlatformDashboardModule } from './dashboard/platform-dashboard.module';
import { PlatformActivityModule } from './activity/platform-activity.module';
import { SystemHealthModule } from './system-health/system-health.module';

@Module({
  imports: [
    PlatformAuthModule,
    PlatformTenantsModule,
    PlatformAdminsModule,
    PlatformDashboardModule,
    PlatformActivityModule,
    SystemHealthModule,
  ],
})
export class PlatformAdminModule {}
