import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAlert } from '../../../database/entities';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformAlertsService } from './platform-alerts.service';
import { PlatformAlertsController } from './platform-alerts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformAlert])],
  controllers: [PlatformAlertsController],
  providers: [PlatformAlertsService, PlatformJwtGuard, PlatformRoleGuard],
  exports: [PlatformAlertsService],
})
export class PlatformAlertsModule {}
