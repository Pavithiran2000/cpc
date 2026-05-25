import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAdminRefreshToken, Tenant } from '../../../database/entities';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { SystemHealthController } from './system-health.controller';
import { SystemHealthService } from './system-health.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAdminRefreshToken, Tenant])],
  controllers: [SystemHealthController],
  providers: [SystemHealthService, PlatformJwtGuard, PlatformRoleGuard],
})
export class SystemHealthModule {}
