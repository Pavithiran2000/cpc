import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditCustomer, CreditSale, DueCollection, Product } from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { CreditDuesController } from './credit-dues.controller';
import { CreditDuesService } from './credit-dues.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditCustomer, CreditSale, DueCollection, Product]),
    AuditModule,
  ],
  controllers: [CreditDuesController],
  providers: [CreditDuesService],
})
export class CreditDuesModule {}
