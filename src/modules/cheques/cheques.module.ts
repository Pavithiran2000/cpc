import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { ChequesController } from './cheques.controller';
import { ChequesService } from './cheques.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [ChequesController],
  providers: [ChequesService],
})
export class ChequesModule {}
