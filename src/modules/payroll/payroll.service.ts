import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { money, toDecimal } from '../../common/utils/calculations';
import { PayrollRun, PayrollRunLine, SalaryDeduction, StaffProfile, StaffShiftAttendance } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreatePayrollRunDto, FinalizePayrollRunDto } from './dto/payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PayrollRun) private readonly runs: Repository<PayrollRun>,
    @InjectRepository(SalaryDeduction) private readonly deductions: Repository<SalaryDeduction>,
    private readonly audit: AuditService,
  ) {}

  listRuns(tenantId: string, query: ListQueryDto) {
    const qb = this.runs.createQueryBuilder('run').where('run.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'run',
      statusColumn: 'run.status',
      dateColumn: 'run.periodStart',
      sortColumns: {
        period_start: 'run.periodStart',
        period_end: 'run.periodEnd',
        status: 'run.status',
        created_at: 'run.createdAt',
      },
      defaultSort: 'run.periodStart',
    });
  }

  salaryDeductions(tenantId: string, query: ListQueryDto) {
    const qb = this.deductions.createQueryBuilder('deduction').where('deduction.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'deduction',
      searchColumns: ['deduction.sourceType', 'deduction.reason'],
      statusColumn: 'deduction.status',
      dateColumn: 'deduction.createdAt',
      sortColumns: {
        created_at: 'deduction.createdAt',
        amount: 'deduction.amount',
        status: 'deduction.status',
        source_type: 'deduction.sourceType',
      },
      defaultSort: 'deduction.createdAt',
    });
  }

  async createRun(tenantId: string, dto: CreatePayrollRunDto, actorUserId: string) {
    const run = await this.runs.save(
      this.runs.create({
        tenantId,
        periodStart: dto.period_start,
        periodEnd: dto.period_end,
        createdBy: actorUserId,
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'payroll_runs', action: 'CREATE', newValue: run });
    return run;
  }

  async approveDeduction(tenantId: string, id: string, actorUserId: string) {
    const deduction = await this.deductions.findOne({ where: { tenantId, id } });
    if (!deduction) throw new NotFoundException('Salary deduction not found');
    deduction.status = 'APPROVED';
    deduction.approvedBy = actorUserId;
    deduction.approvedAt = new Date();
    const saved = await this.deductions.save(deduction);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'salary_deductions', action: 'APPROVE', newValue: { id } });
    return saved;
  }

  async finalizeRun(tenantId: string, id: string, dto: FinalizePayrollRunDto, actorUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const run = await manager.findOne(PayrollRun, { where: { tenantId, id } });
      if (!run) throw new NotFoundException('Payroll run not found');
      if (run.status === 'FINALIZED') throw new BadRequestException('Payroll run already finalized');

      if (!dto.attendance_override) {
        const incomplete = await manager
          .getRepository(StaffShiftAttendance)
          .createQueryBuilder('attendance')
          .innerJoin('shift_sessions', 'ss', 'ss.id = attendance.shift_session_id AND ss.tenant_id = attendance.tenant_id')
          .where('attendance.tenant_id = :tenantId', { tenantId })
          .andWhere('ss.business_date BETWEEN :from AND :to', { from: run.periodStart, to: run.periodEnd })
          .andWhere('(attendance.clock_in_at IS NULL OR attendance.clock_out_at IS NULL)')
          .getCount();
        if (incomplete > 0) {
          throw new BadRequestException('Payroll finalization blocked by incomplete required attendance');
        }
      }

      const staff = await manager.find(StaffProfile, { where: { tenantId, status: 'ACTIVE' } });

      for (const profile of staff) {
        // Count closed shifts for this staff in the period
        const shiftCount = await manager
          .getRepository(StaffShiftAttendance)
          .createQueryBuilder('attendance')
          .innerJoin('shift_sessions', 'ss', 'ss.id = attendance.shift_session_id AND ss.tenant_id = attendance.tenant_id')
          .where('attendance.tenant_id = :tenantId', { tenantId })
          .andWhere('attendance.staff_id = :staffId', { staffId: profile.id })
          .andWhere('ss.business_date BETWEEN :from AND :to', { from: run.periodStart, to: run.periodEnd })
          .andWhere("ss.status = 'CLOSED'")
          .getCount();

        // Only include APPROVED deductions not yet assigned to a payroll run
        const approvedDeductions = await manager
          .createQueryBuilder(SalaryDeduction, 'sd')
          .where('sd.tenant_id = :tenantId', { tenantId })
          .andWhere('sd.staff_id = :staffId', { staffId: profile.id })
          .andWhere("sd.status = 'APPROVED'")
          .andWhere('sd.payroll_run_id IS NULL')
          .getMany();

        const deductionAmount = approvedDeductions.reduce((sum, d) => sum + toDecimal(d.amount), 0);
        const gross = toDecimal(profile.basicSalary) + shiftCount * toDecimal(profile.shiftRate);

        await manager.save(
          manager.create(PayrollRunLine, {
            tenantId,
            payrollRunId: run.id,
            staffId: profile.id,
            shiftCount,
            grossAmount: money(gross),
            deductionAmount: money(deductionAmount),
            netAmount: money(Math.max(0, gross - deductionAmount)),
          }),
        );

        // Link deductions to this payroll run
        for (const deduction of approvedDeductions) {
          deduction.payrollRunId = run.id;
          await manager.save(deduction);
        }
      }

      run.status = 'FINALIZED';
      run.finalizedBy = actorUserId;
      run.finalizedAt = new Date();
      await manager.save(run);
      await this.audit.record({ tenantId, actorUserId, moduleName: 'payroll_runs', action: 'FINALIZE', newValue: { id } }, manager);
      return run;
    });
  }
}
