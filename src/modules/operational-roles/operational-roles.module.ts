import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { OperationalRolesController } from './operational-roles.controller';
import { OperationalRolesService } from './operational-roles.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [OperationalRolesController],
  providers: [OperationalRolesService],
})
export class OperationalRolesModule {}
