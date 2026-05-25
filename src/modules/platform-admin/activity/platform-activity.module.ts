import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformActivityLog } from '../../../database/entities';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformActivityController } from './platform-activity.controller';
import { PlatformActivityService } from './platform-activity.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformActivityLog])],
  controllers: [PlatformActivityController],
  providers: [PlatformActivityService, PlatformJwtGuard, PlatformRoleGuard],
})
export class PlatformActivityModule {}
