import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformActivityLog, PlatformRegistration } from '../../../database/entities';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformRegistrationsController } from './platform-registrations.controller';
import { PlatformRegistrationsService } from './platform-registrations.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformRegistration, PlatformActivityLog])],
  controllers: [PlatformRegistrationsController],
  providers: [PlatformRegistrationsService, PlatformJwtGuard, PlatformRoleGuard],
})
export class PlatformRegistrationsModule {}
