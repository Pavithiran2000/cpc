import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { BowserReceiptsController } from './bowser-receipts.controller';
import { BowserReceiptsService } from './bowser-receipts.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [BowserReceiptsController],
  providers: [BowserReceiptsService],
})
export class BowserReceiptsModule {}
