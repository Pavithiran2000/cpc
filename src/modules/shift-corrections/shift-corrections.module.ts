import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftCorrectionRequest, ShiftSession, PumperCashSubmission, SalaryDeduction, TenantSetting } from '../../database/entities';
import { AuditModule } from '../audit/audit.module';
import { ShiftCorrectionsController } from './shift-corrections.controller';
import { ShiftCorrectionsService } from './shift-corrections.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShiftCorrectionRequest, ShiftSession, PumperCashSubmission, SalaryDeduction, TenantSetting]),
    AuditModule,
  ],
  controllers: [ShiftCorrectionsController],
  providers: [ShiftCorrectionsService],
})
export class ShiftCorrectionsModule {}
