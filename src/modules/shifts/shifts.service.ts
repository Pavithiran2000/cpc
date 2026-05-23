import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { calculateCashVariance, calculateDispensed, calculateExpectedCash, money, quantity, rangesOverlap, toDecimal } from '../../common/utils/calculations';
import {
  ProductPrice,
  PumpMeterReading,
  PumpNozzle,
  PumpNozzleAssignment,
  PumperCashSubmission,
  SalaryDeduction,
  ShiftSession,
  ShiftTemplate,
  StaffProfile,
  StockBalance,
  StockMovement,
  TenantSetting,
} from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateShiftSessionDto, CreateShiftTemplateDto, UpdateShiftTemplateDto } from './dto/shift-template.dto';
import { AssignNozzlesDto, CashSubmissionsDto, CloseShiftDto, ReadingsDto } from './dto/shift-flow.dto';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ShiftTemplate) private readonly templates: Repository<ShiftTemplate>,
    @InjectRepository(ShiftSession) private readonly sessions: Repository<ShiftSession>,
    @InjectRepository(TenantSetting) private readonly settings: Repository<TenantSetting>,
    @InjectRepository(StaffProfile) private readonly staff: Repository<StaffProfile>,
    private readonly audit: AuditService,
  ) {}

  listTemplates(tenantId: string, query: ListQueryDto) {
    const qb = this.templates.createQueryBuilder('template').where('template.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'template',
      searchColumns: ['template.shiftName'],
      statusColumn: 'template.status',
      dateColumn: 'template.createdAt',
      sortColumns: {
        shift_name: 'template.shiftName',
        sequence_no: 'template.sequenceNo',
        status: 'template.status',
        created_at: 'template.createdAt',
      },
      defaultSort: 'template.sequenceNo',
    });
  }

  async createTemplate(tenantId: string, dto: CreateShiftTemplateDto, actorUserId: string) {
    await this.assertNoOverlap(tenantId, dto.start_time, dto.end_time);
    const template = await this.templates.save(
      this.templates.create({
        tenantId,
        shiftName: dto.shift_name,
        startTime: dto.start_time,
        endTime: dto.end_time,
        isNightShift: dto.is_night_shift ?? false,
        sequenceNo: dto.sequence_no ?? 1,
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_templates', action: 'CREATE', newValue: template });
    return template;
  }

  async updateTemplate(tenantId: string, id: string, dto: UpdateShiftTemplateDto, actorUserId: string) {
    const template = await this.templates.findOne({ where: { tenantId, id } });
    if (!template) throw new NotFoundException('Shift template not found');
    const nextStart = dto.start_time ?? template.startTime;
    const nextEnd = dto.end_time ?? template.endTime;
    if (dto.start_time || dto.end_time) await this.assertNoOverlap(tenantId, nextStart, nextEnd, id);
    Object.assign(template, {
      shiftName: dto.shift_name ?? template.shiftName,
      startTime: nextStart,
      endTime: nextEnd,
      isNightShift: dto.is_night_shift ?? template.isNightShift,
      sequenceNo: dto.sequence_no ?? template.sequenceNo,
      status: dto.status ?? template.status,
    });
    const saved = await this.templates.save(template);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_templates', action: 'UPDATE', newValue: saved });
    return saved;
  }

  listSessions(tenantId: string, query: ListQueryDto) {
    const qb = this.sessions.createQueryBuilder('session').where('session.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'session',
      statusColumn: 'session.status',
      dateColumn: 'session.businessDate',
      sortColumns: {
        business_date: 'session.businessDate',
        status: 'session.status',
        opened_at: 'session.openedAt',
        closed_at: 'session.closedAt',
        created_at: 'session.createdAt',
      },
      defaultSort: 'session.businessDate',
    });
  }

  async findSession(tenantId: string, id: string) {
    const session = await this.sessions.findOne({ where: { tenantId, id } });
    if (!session) throw new NotFoundException('Shift session not found');
    const [assignments, readings, cash] = await Promise.all([
      this.dataSource.getRepository(PumpNozzleAssignment).find({ where: { tenantId, shiftSessionId: id } }),
      this.dataSource.getRepository(PumpMeterReading).find({ where: { tenantId, shiftSessionId: id } }),
      this.dataSource.getRepository(PumperCashSubmission).find({ where: { tenantId, shiftSessionId: id } }),
    ]);
    return { ...session, assignments, readings, cash_submissions: cash };
  }

  async createSession(tenantId: string, dto: CreateShiftSessionDto, actorUserId: string) {
    const template = await this.templates.findOne({ where: { tenantId, id: dto.shift_template_id, status: 'ACTIVE' } });
    if (!template) throw new NotFoundException('Shift template not found or not active');
    if (dto.manager_id) await this.ensureStaffWithRole(tenantId, dto.manager_id, 'Manager');
    const session = await this.sessions.save(
      this.sessions.create({
        tenantId,
        shiftTemplateId: dto.shift_template_id,
        businessDate: dto.business_date,
        managerId: dto.manager_id,
        openedBy: actorUserId,
        status: 'DRAFT',
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_sessions', action: 'CREATE', newValue: session });
    return session;
  }

  async openSession(tenantId: string, id: string, actorUserId: string) {
    const session = await this.sessions.findOne({ where: { tenantId, id } });
    if (!session) throw new NotFoundException('Shift session not found');
    if (session.status === 'CLOSED') throw new BadRequestException('Closed shifts cannot be reopened');
    if (session.status === 'CANCELLED') throw new BadRequestException('Cancelled shifts cannot be reopened');
    session.status = 'ACTIVE';
    session.openedAt = new Date();
    session.openedBy = actorUserId;
    const saved = await this.sessions.save(session);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_sessions', action: 'OPEN', newValue: saved });
    return saved;
  }

  async cancelSession(tenantId: string, id: string, actorUserId: string) {
    const session = await this.sessions.findOne({ where: { tenantId, id } });
    if (!session) throw new NotFoundException('Shift session not found');
    if (session.status === 'CLOSED') throw new BadRequestException('Closed shifts cannot be cancelled');
    if (session.status === 'ACTIVE') throw new BadRequestException('Active shifts must be closed, not cancelled');
    session.status = 'CANCELLED';
    const saved = await this.sessions.save(session);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_sessions', action: 'CANCEL', newValue: saved });
    return saved;
  }

  async assignNozzles(tenantId: string, shiftSessionId: string, dto: AssignNozzlesDto, actorUserId: string) {
    const session = await this.sessions.findOne({ where: { tenantId, id: shiftSessionId } });
    if (!session) throw new NotFoundException('Shift session not found');
    if (session.status === 'CLOSED') throw new BadRequestException('Closed shifts are locked');
    if (session.status === 'CANCELLED') throw new BadRequestException('Cancelled shifts are locked');
    for (const assignment of dto.assignments) {
      await this.ensureStaffWithRole(tenantId, assignment.pumper_id, 'Pumper');
    }
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(
        dto.assignments.map((assignment) =>
          manager.create(PumpNozzleAssignment, {
            tenantId,
            shiftSessionId,
            nozzleId: assignment.nozzle_id,
            pumperId: assignment.pumper_id,
            assignedBy: actorUserId,
          }),
        ),
      );
      await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_assignments', action: 'ASSIGN_NOZZLES', newValue: saved }, manager);
      return saved;
    });
  }

  async recordOpeningReadings(tenantId: string, shiftSessionId: string, dto: ReadingsDto, actorUserId: string) {
    const session = await this.sessions.findOne({ where: { tenantId, id: shiftSessionId } });
    if (!session) throw new NotFoundException('Shift session not found');
    if (session.status === 'CLOSED') throw new BadRequestException('Closed shifts are locked');

    const meterReadingRepo = this.dataSource.getRepository(PumpMeterReading);
    const assignmentRepo = this.dataSource.getRepository(PumpNozzleAssignment);
    const nozzleRepo = this.dataSource.getRepository(PumpNozzle);

    const rows: PumpMeterReading[] = [];
    for (const reading of dto.readings) {
      const assignment = await assignmentRepo.findOne({ where: { tenantId, shiftSessionId, nozzleId: reading.nozzle_id } });
      const nozzle = await nozzleRepo.findOne({ where: { tenantId, id: reading.nozzle_id } });
      if (!nozzle) throw new NotFoundException(`Nozzle ${reading.nozzle_id} not found`);

      // Upsert: if a reading row already exists, update it; otherwise create
      const existing = await meterReadingRepo.findOne({ where: { tenantId, shiftSessionId, nozzleId: reading.nozzle_id } });
      if (existing) {
        existing.openingReading = quantity(reading.meter_reading);
        existing.recordedBy = actorUserId;
        rows.push(existing);
      } else {
        rows.push(
          meterReadingRepo.create({
            tenantId,
            shiftSessionId,
            pumpId: nozzle.pumpId,
            nozzleId: reading.nozzle_id,
            fuelProductId: nozzle.productId,
            pumperId: assignment?.pumperId,
            openingReading: quantity(reading.meter_reading),
            status: 'OPEN',
            recordedBy: actorUserId,
          }),
        );
      }
    }
    const saved = await meterReadingRepo.save(rows);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'meter_readings', action: 'OPENING', newValue: saved });
    return saved;
  }

  async recordClosingReadings(tenantId: string, shiftSessionId: string, dto: ReadingsDto, actorUserId: string) {
    const session = await this.sessions.findOne({ where: { tenantId, id: shiftSessionId } });
    if (!session) throw new NotFoundException('Shift session not found');
    if (session.status === 'CLOSED') throw new BadRequestException('Closed shifts are locked');
    if (session.status === 'CANCELLED') throw new BadRequestException('Cancelled shifts are locked');

    const meterReadingRepo = this.dataSource.getRepository(PumpMeterReading);
    const nozzleRepo = this.dataSource.getRepository(PumpNozzle);
    const rows: PumpMeterReading[] = [];

    for (const input of dto.readings) {
      const reading = await meterReadingRepo.findOne({ where: { tenantId, shiftSessionId, nozzleId: input.nozzle_id } });
      if (!reading) throw new BadRequestException('Cannot record closing reading before opening reading');
      const nozzle = await nozzleRepo.findOne({ where: { tenantId, id: input.nozzle_id } });
      if (!nozzle) throw new NotFoundException(`Nozzle ${input.nozzle_id} not found`);

      const { dispensed, isRollover } = calculateDispensed(reading.openingReading, input.meter_reading, nozzle.meterCapacity);
      reading.closingReading = quantity(input.meter_reading);
      reading.isRollover = isRollover;
      reading.dispensedLitres = quantity(dispensed);
      reading.status = 'CLOSING';
      reading.recordedBy = actorUserId;
      rows.push(reading);
    }

    const saved = await meterReadingRepo.save(rows);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'meter_readings', action: 'CLOSING', newValue: saved });
    return saved;
  }

  async recordCash(tenantId: string, shiftSessionId: string, dto: CashSubmissionsDto, actorUserId: string) {
    const session = await this.sessions.findOne({ where: { tenantId, id: shiftSessionId } });
    if (!session) throw new NotFoundException('Shift session not found');
    if (session.status === 'CLOSED') throw new BadRequestException('Closed shifts are locked');
    const repo = this.dataSource.getRepository(PumperCashSubmission);
    const saved: PumperCashSubmission[] = [];
    for (const submission of dto.submissions) {
      const existing = await repo.findOne({ where: { tenantId, shiftSessionId, pumperId: submission.pumper_id } });
      saved.push(
        await repo.save(
          repo.create({
            ...existing,
            tenantId,
            shiftSessionId,
            pumperId: submission.pumper_id,
            actualCash: money(submission.actual_cash),
          }),
        ),
      );
    }
    await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_cash', action: 'SUBMIT', newValue: saved });
    return saved;
  }

  async close(tenantId: string, shiftSessionId: string, dto: CloseShiftDto, actorUserId: string) {
    await this.dataSource.transaction(async (manager) => {
      const session = await manager.findOne(ShiftSession, { where: { tenantId, id: shiftSessionId } });
      if (!session) throw new NotFoundException('Shift session not found');
      if (session.status === 'CLOSED') throw new BadRequestException('Closed shifts are locked');

      const assignments = await manager.find(PumpNozzleAssignment, { where: { tenantId, shiftSessionId } });
      if (!assignments.length) throw new BadRequestException('Cannot close shift without nozzle assignments');

      const closingByNozzle = new Map(dto.closing_readings.map((r) => [r.nozzle_id, r]));
      for (const assignment of assignments) {
        if (!closingByNozzle.has(assignment.nozzleId)) {
          throw new BadRequestException('Cannot close shift while any pump reading is missing');
        }
      }

      // Mark as CLOSING
      session.status = 'CLOSING';
      await manager.save(session);

      const expectedByPumper = new Map<string, number>();

      for (const assignment of assignments) {
        const reading = await manager.findOne(PumpMeterReading, {
          where: { tenantId, shiftSessionId, nozzleId: assignment.nozzleId },
        });
        if (!reading) throw new BadRequestException('Cannot close shift while any opening reading is missing');

        const closingInput = closingByNozzle.get(assignment.nozzleId)!;
        const nozzle = await manager.findOne(PumpNozzle, { where: { tenantId, id: assignment.nozzleId } });
        if (!nozzle) throw new NotFoundException('Nozzle not found');

        const { dispensed, isRollover } = calculateDispensed(
          reading.openingReading,
          closingInput.meter_reading,
          nozzle.meterCapacity,
        );

        const price = await this.activePrice(manager, tenantId, nozzle.productId, new Date());
        const expected = calculateExpectedCash(dispensed, price.sellingPrice);

        // Update the PumpMeterReading row with closing data
        reading.closingReading = quantity(closingInput.meter_reading);
        reading.isRollover = isRollover;
        reading.dispensedLitres = quantity(dispensed);
        reading.unitPrice = money(toDecimal(price.sellingPrice));
        reading.expectedCash = money(expected);
        reading.status = 'CLOSED';
        reading.recordedBy = actorUserId;
        await manager.save(reading);

        if (isRollover) {
          await this.audit.record(
            {
              tenantId,
              actorUserId,
              moduleName: 'meter_readings',
              action: 'METER_ROLLOVER_DETECTED',
              newValue: { nozzleId: assignment.nozzleId, openingReading: reading.openingReading, closingReading: closingInput.meter_reading, meterCapacity: nozzle.meterCapacity, dispensed },
            },
            manager,
          );
        }

        const pumperExpected = expectedByPumper.get(assignment.pumperId) ?? 0;
        expectedByPumper.set(assignment.pumperId, pumperExpected + expected);

        await this.reduceStock(manager, tenantId, nozzle.productId, dispensed, 'SHIFT_SALE', 'SHIFT_SESSION', shiftSessionId, actorUserId);
      }

      const approvalRequired = await this.settingEnabled(tenantId, 'cash_shortfall_requires_approval', true, manager);
      const deductionEnabled = await this.settingEnabled(tenantId, 'salary_deduction_enabled', true, manager);

      for (const submission of dto.cash_submissions) {
        const expectedCash = expectedByPumper.get(submission.pumper_id) ?? 0;
        const variance = calculateCashVariance(expectedCash, submission.actual_cash);
        const existingCash = await manager.findOne(PumperCashSubmission, {
          where: { tenantId, shiftSessionId, pumperId: submission.pumper_id },
        });
        const cash = await manager.save(
          manager.create(PumperCashSubmission, {
            ...existingCash,
            tenantId,
            shiftSessionId,
            pumperId: submission.pumper_id,
            expectedCash: money(expectedCash),
            actualCash: money(submission.actual_cash),
            variance: money(variance.variance),
            shortfall: money(variance.shortfall),
            excess: money(variance.excess),
          }),
        );
        if (deductionEnabled && variance.shortfall > 0) {
          const existingDeduction = await manager.findOne(SalaryDeduction, {
            where: { tenantId, sourceType: 'CASH_SHORTFALL', sourceId: cash.id },
          });
          await manager.save(
            manager.create(SalaryDeduction, {
              ...existingDeduction,
              tenantId,
              staffId: submission.pumper_id,
              shiftSessionId,
              sourceType: 'CASH_SHORTFALL',
              sourceId: cash.id,
              amount: money(variance.shortfall),
              status: approvalRequired ? 'PENDING_APPROVAL' : 'APPROVED',
              approvedBy: approvalRequired ? undefined : actorUserId,
              approvedAt: approvalRequired ? undefined : new Date(),
              reason: 'Shift cash shortfall',
            }),
          );
        }
      }

      session.status = 'CLOSED';
      session.closedBy = actorUserId;
      session.closedAt = new Date();
      await manager.save(session);
      await this.audit.record({ tenantId, actorUserId, moduleName: 'shift_sessions', action: 'CLOSE', newValue: { id: shiftSessionId } }, manager);
    });
    return this.findSession(tenantId, shiftSessionId);
  }

  private async assertNoOverlap(tenantId: string, start: string, end: string, excludeId?: string) {
    const allowOverlap = await this.settingEnabled(tenantId, 'allow_shift_overlap', false);
    if (allowOverlap) return;
    const templates = await this.templates.find({ where: { tenantId, status: 'ACTIVE' } });
    const overlapping = templates.some((t) => t.id !== excludeId && rangesOverlap(start, end, t.startTime, t.endTime));
    if (overlapping) throw new BadRequestException('Shift template overlaps an existing active shift');
  }

  private async ensureStaffWithRole(tenantId: string, staffId: string, roleName: string) {
    const staff = await this.staff.findOne({ where: { tenantId, id: staffId, status: 'ACTIVE' }, relations: { operationalRole: true } });
    if (!staff || staff.operationalRole?.name !== roleName) {
      throw new BadRequestException(`${roleName} assignment must reference a matching active staff profile`);
    }
  }

  private async settingEnabled(tenantId: string, key: string, fallback: boolean, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(TenantSetting) : this.settings;
    const setting = await repo.findOne({ where: { tenantId, settingKey: key } });
    if (!setting?.settingValue) return fallback;
    return setting.settingValue === 'true';
  }

  private async activePrice(manager: EntityManager, tenantId: string, productId: string, at: Date) {
    const price = await manager
      .getRepository(ProductPrice)
      .createQueryBuilder('price')
      .where('price.tenant_id = :tenantId', { tenantId })
      .andWhere('price.product_id = :productId', { productId })
      .andWhere('price.effective_from <= :at', { at })
      .andWhere('(price.effective_to IS NULL OR price.effective_to > :at)', { at })
      .andWhere('price.status = :status', { status: 'ACTIVE' })
      .orderBy('price.effective_from', 'DESC')
      .getOne();
    if (!price) throw new BadRequestException('Active product price is missing');
    return price;
  }

  private async reduceStock(
    manager: EntityManager,
    tenantId: string,
    productId: string,
    amount: number,
    movementType: string,
    referenceType: string,
    referenceId: string,
    actorUserId: string,
  ) {
    let balance = await manager.findOne(StockBalance, { where: { tenantId, productId } });
    balance ??= manager.create(StockBalance, { tenantId, productId, quantityOnHand: '0' });
    const next = toDecimal(balance.quantityOnHand) - amount;
    if (next < 0) throw new BadRequestException('Stock balance cannot be negative');
    balance.quantityOnHand = quantity(next);
    await manager.save(balance);
    await manager.save(
      manager.create(StockMovement, {
        tenantId,
        productId,
        movementType,
        referenceType,
        referenceId,
        quantityIn: '0',
        quantityOut: quantity(amount),
        balanceAfter: balance.quantityOnHand,
        createdBy: actorUserId,
      }),
    );
  }
}
