import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { money, toDecimal } from '../../common/utils/calculations';
import {
  PumperCashSubmission,
  SalaryDeduction,
  ShiftCorrectionRequest,
  ShiftSession,
  TenantSetting,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateShiftCorrectionDto } from './dto/shift-correction.dto';

@Injectable()
export class ShiftCorrectionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ShiftCorrectionRequest)
    private readonly corrections: Repository<ShiftCorrectionRequest>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string) {
    return this.corrections.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async create(tenantId: string, dto: CreateShiftCorrectionDto, actorUserId: string) {
    const session = await this.dataSource.getRepository(ShiftSession).findOne({ where: { tenantId, id: dto.shift_session_id } });
    if (!session) throw new NotFoundException('Shift session not found');
    if (session.status !== 'CLOSED') throw new BadRequestException('Corrections can only be requested for CLOSED shifts');
    if (!dto.reason?.trim()) throw new BadRequestException('Correction reason is required');

    const correction = await this.corrections.save(
      this.corrections.create({
        tenantId,
        shiftSessionId: dto.shift_session_id,
        correctionType: dto.correction_type,
        fieldName: dto.field_name,
        oldValue: dto.old_value,
        newValue: dto.new_value,
        reason: dto.reason,
        requestedBy: actorUserId,
        status: 'PENDING',
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_corrections', action: 'REQUEST_CREATED', newValue: correction });
    return correction;
  }

  async approve(tenantId: string, id: string, actorUserId: string, portalRole: string) {
    if (portalRole !== PortalRole.Admin) throw new ForbiddenException('Only ADMIN can approve corrections');
    const correction = await this.corrections.findOne({ where: { tenantId, id } });
    if (!correction) throw new NotFoundException('Correction request not found');
    if (correction.status !== 'PENDING') throw new BadRequestException('Only PENDING corrections can be approved');
    correction.status = 'APPROVED';
    correction.approvedBy = actorUserId;
    correction.approvedAt = new Date();
    const saved = await this.corrections.save(correction);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_corrections', action: 'APPROVED', newValue: { id } });
    return saved;
  }

  async apply(tenantId: string, id: string, actorUserId: string, portalRole: string) {
    if (portalRole !== PortalRole.Admin) throw new ForbiddenException('Only ADMIN can apply corrections');
    return this.dataSource.transaction(async (manager) => {
      const correction = await manager.findOne(ShiftCorrectionRequest, { where: { tenantId, id } });
      if (!correction) throw new NotFoundException('Correction request not found');
      if (correction.status !== 'APPROVED') throw new BadRequestException('Only APPROVED corrections can be applied');

      if (correction.correctionType === 'CASH') {
        await this.applyCashCorrection(manager, tenantId, correction, actorUserId);
      }

      correction.status = 'APPLIED' as string;
      await manager.save(correction);

      await this.audit.record(
        {
          tenantId,
          actorUserId,
          moduleName: 'shift_corrections',
          action: 'APPLIED',
          oldValue: correction.oldValue,
          newValue: { correctionRequestId: id, ...correction.newValue as object },
        },
        manager,
      );
      return correction;
    });
  }

  private async applyCashCorrection(manager: DataSource['manager'], tenantId: string, correction: ShiftCorrectionRequest, actorUserId: string) {
    const newValues = correction.newValue as { pumper_id?: string; actual_cash?: number };
    if (!newValues.pumper_id || newValues.actual_cash === undefined) return;

    const submission = await manager.findOne(PumperCashSubmission, {
      where: { tenantId, shiftSessionId: correction.shiftSessionId, pumperId: newValues.pumper_id },
    });
    if (!submission) return;

    const oldActual = toDecimal(submission.actualCash);
    const newActual = newValues.actual_cash;
    const oldShortfall = toDecimal(submission.shortfall);
    const expected = toDecimal(submission.expectedCash);
    const newShortfall = Math.max(expected - newActual, 0);
    const newExcess = Math.max(newActual - expected, 0);

    submission.actualCash = money(newActual);
    submission.shortfall = money(newShortfall);
    submission.excess = money(newExcess);
    submission.variance = money(newActual - expected);
    await manager.save(submission);

    // Update or reverse salary deduction if shortfall changed
    const existingDeduction = await manager.findOne(SalaryDeduction, {
      where: { tenantId, staffId: newValues.pumper_id, shiftSessionId: correction.shiftSessionId, sourceType: 'CASH_SHORTFALL' },
    });

    const settingRow = await manager.findOne(TenantSetting, { where: { tenantId, settingKey: 'cash_shortfall_requires_approval' } });
    const approvalRequired = settingRow?.settingValue !== 'false';

    if (existingDeduction) {
      if (newShortfall <= 0) {
        existingDeduction.deletedAt = new Date();
        await manager.save(existingDeduction);
      } else {
        existingDeduction.amount = money(newShortfall);
        existingDeduction.status = 'PENDING_APPROVAL';
        existingDeduction.approvedBy = undefined;
        existingDeduction.approvedAt = undefined;
        await manager.save(existingDeduction);
      }
    } else if (newShortfall > 0) {
      await manager.save(
        manager.create(SalaryDeduction, {
          tenantId,
          staffId: newValues.pumper_id,
          shiftSessionId: correction.shiftSessionId,
          sourceType: 'CASH_SHORTFALL',
          amount: money(newShortfall),
          status: approvalRequired ? 'PENDING_APPROVAL' : 'APPROVED',
          approvedBy: approvalRequired ? undefined : actorUserId,
          approvedAt: approvalRequired ? undefined : new Date(),
          reason: `Corrected cash shortfall (was ${oldShortfall}, now ${newShortfall})`,
        }),
      );
    }
  }
}
