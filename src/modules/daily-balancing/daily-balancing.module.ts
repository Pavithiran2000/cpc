import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { DailyBalancingController } from './daily-balancing.controller';
import { DailyBalancingService } from './daily-balancing.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [DailyBalancingController],
  providers: [DailyBalancingService],
})
export class DailyBalancingModule {}
