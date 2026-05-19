import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { PortalUsersController } from './portal-users.controller';
import { PortalUsersService } from './portal-users.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [PortalUsersController],
  providers: [PortalUsersService],
})
export class PortalUsersModule {}
