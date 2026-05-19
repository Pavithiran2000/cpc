import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { StockOrdersController } from './stock-orders.controller';
import { StockOrdersService } from './stock-orders.service';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [StockOrdersController],
  providers: [StockOrdersService],
})
export class StockOrdersModule {}
