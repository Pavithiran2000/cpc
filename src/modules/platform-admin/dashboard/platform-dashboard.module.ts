import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformActivityLog, Tenant } from '../../../database/entities';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformDashboardController } from './platform-dashboard.controller';
import { PlatformDashboardService } from './platform-dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, PlatformActivityLog])],
  controllers: [PlatformDashboardController],
  providers: [PlatformDashboardService, PlatformJwtGuard, PlatformRoleGuard],
})
export class PlatformDashboardModule {}
