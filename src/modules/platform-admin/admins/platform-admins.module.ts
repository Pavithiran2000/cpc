import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformActivityLog, PlatformAdmin, PlatformAdminRefreshToken } from '../../../database/entities';
import { EmailModule } from '../../email/email.module';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformAdminsController } from './platform-admins.controller';
import { PlatformAdminsService } from './platform-admins.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformAdmin, PlatformAdminRefreshToken, PlatformActivityLog]),
    EmailModule,
  ],
  controllers: [PlatformAdminsController],
  providers: [PlatformAdminsService, PlatformJwtGuard, PlatformRoleGuard],
})
export class PlatformAdminsModule {}
