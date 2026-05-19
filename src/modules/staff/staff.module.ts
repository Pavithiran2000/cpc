import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
