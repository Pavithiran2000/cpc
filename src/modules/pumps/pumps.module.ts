import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { PumpsController } from './pumps.controller';
import { PumpsService } from './pumps.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [PumpsController],
  providers: [PumpsService],
})
export class PumpsModule {}
