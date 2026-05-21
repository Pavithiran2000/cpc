import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { CreditDuesService } from '../src/modules/credit-dues/credit-dues.service';
import { PayrollService } from '../src/modules/payroll/payroll.service';
import { RefreshTokenService } from '../src/modules/auth/refresh-token.service';
import { ShiftsService } from '../src/modules/shifts/shifts.service';
import {
  CreditCustomer,
  CreditSale,
  PayrollRun,
  PayrollRunLine,
  Product,
  ProductPrice,
  PumpMeterReading,
  PumpNozzle,
  PumpNozzleAssignment,
  PumperCashSubmission,
  SalaryDeduction,
  ShiftSession,
  StaffProfile,
  StaffShiftAttendance,
  StockBalance,
  StockMovement,
  TenantSetting,
} from '../src/database/entities';

type EntityTarget = Function;

function repoStub<T extends object>(initial?: T) {
  return {
    findOne: jest.fn().mockResolvedValue(initial),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(async (value: T) => value),
    create: jest.fn((value: T) => value),
    createQueryBuilder: jest.fn(),
  };
}

function managerCreate<T extends object>(entity: EntityTarget, value: T): T & { __entity: string } {
  return { ...value, __entity: entity.name };
}

describe('business rule coverage', () => {
  const tenantId = 'tenant-1';
  const actorUserId = 'user-1';

  it('does not create stock movement for fuel credit sales', async () => {
    const saved: Array<{ __entity?: string }> = [];
    const manager = {
      findOne: jest.fn(async (entity: EntityTarget) => {
        if (entity === CreditCustomer) return { id: 'customer-1', outstandingBalance: '0.00', creditLimit: '0.00' };
        if (entity === Product) return { id: 'fuel-1', category: 'FUEL' };
        return undefined;
      }),
      create: jest.fn(managerCreate),
      save: jest.fn(async (value: { __entity?: string; id?: string }) => {
        const withId = { id: value.id ?? `${value.__entity}-1`, ...value };
        saved.push(withId);
        return withId;
      }),
    };
    const dataSource = { transaction: jest.fn((callback: (m: typeof manager) => Promise<unknown>) => callback(manager)) };
    const audit = { record: jest.fn() };
    const service = new CreditDuesService(dataSource as never, repoStub() as never, repoStub() as never, repoStub() as never, repoStub() as never, audit as never);

    await service.createCreditSale(
      tenantId,
      { customer_id: 'customer-1', product_id: 'fuel-1', quantity: 10, unit_price: 370, due_date: '2026-05-19', shift_session_id: 'shift-1' },
      actorUserId,
    );

    expect(saved.some((row) => row.__entity === StockMovement.name)).toBe(false);
    expect(saved.some((row) => row.__entity === StockBalance.name)).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ moduleName: 'credit_sales', action: 'CREATE' }), manager);
  });

  it('deducts stock immediately for gas and lubricant credit sales', async () => {
    const saved: Array<{ __entity?: string; quantityOnHand?: string; movementType?: string }> = [];
    const manager = {
      findOne: jest.fn(async (entity: EntityTarget) => {
        if (entity === CreditCustomer) return { id: 'customer-1', outstandingBalance: '0.00', creditLimit: '0.00' };
        if (entity === Product) return { id: 'gas-1', category: 'GAS' };
        if (entity === StockBalance) return { tenantId, productId: 'gas-1', quantityOnHand: '20.000' };
        return undefined;
      }),
      create: jest.fn(managerCreate),
      save: jest.fn(async (value: { __entity?: string; id?: string; quantityOnHand?: string; movementType?: string }) => {
        const withId = { id: value.id ?? `${value.__entity}-1`, ...value };
        saved.push(withId);
        return withId;
      }),
    };
    const dataSource = { transaction: jest.fn((callback: (m: typeof manager) => Promise<unknown>) => callback(manager)) };
    const service = new CreditDuesService(dataSource as never, repoStub() as never, repoStub() as never, repoStub() as never, repoStub() as never, { record: jest.fn() } as never);

    await service.createCreditSale(
      tenantId,
      { customer_id: 'customer-1', product_id: 'gas-1', quantity: 3, unit_price: 5000, due_date: '2026-05-19', shift_session_id: 'shift-1' },
      actorUserId,
    );

    expect(saved).toContainEqual(expect.objectContaining({ quantityOnHand: '17.000' }));
    expect(saved).toContainEqual(expect.objectContaining({ __entity: StockMovement.name, movementType: 'CREDIT_SALE' }));
  });

  it('blocks normal assignment edits on closed shifts', async () => {
    const service = new ShiftsService(
      {} as never,
      repoStub() as never,
      repoStub({ id: 'shift-1', tenantId, status: 'CLOSED' }) as never,
      repoStub() as never,
      repoStub() as never,
      { record: jest.fn() } as never,
    );

    await expect(
      service.assignNozzles(tenantId, 'shift-1', { assignments: [{ nozzle_id: 'nozzle-1', pumper_id: 'pumper-1' }] }, actorUserId),
    ).rejects.toThrow('Closed shifts are locked');
  });

  it('creates pending salary deductions when shortfall approval is required', async () => {
    const saved: Array<{ __entity?: string; status?: string; isRollover?: boolean }> = [];
    const manager = shiftCloseManager(saved, 'true');
    const dataSource = {
      transaction: jest.fn((callback: (m: typeof manager) => Promise<unknown>) => callback(manager)),
      getRepository: jest.fn(() => ({ find: jest.fn().mockResolvedValue([]) })),
    };
    const service = new ShiftsService(dataSource as never, repoStub() as never, repoStub({ id: 'shift-1', tenantId, status: 'CLOSED' }) as never, repoStub() as never, repoStub() as never, { record: jest.fn() } as never);

    await service.close(
      tenantId,
      'shift-1',
      { closing_readings: [{ nozzle_id: 'nozzle-1', meter_reading: 20 }], cash_submissions: [{ pumper_id: 'pumper-1', actual_cash: 3000 }] },
      actorUserId,
    );

    expect(saved).toContainEqual(expect.objectContaining({ __entity: SalaryDeduction.name, status: 'PENDING_APPROVAL' }));
    expect(saved).toContainEqual(expect.objectContaining({ nozzleId: 'nozzle-1', isRollover: true }));
  });

  it('auto-approves salary deductions when shortfall approval is disabled', async () => {
    const saved: Array<{ __entity?: string; status?: string }> = [];
    const manager = shiftCloseManager(saved, 'false');
    const dataSource = {
      transaction: jest.fn((callback: (m: typeof manager) => Promise<unknown>) => callback(manager)),
      getRepository: jest.fn(() => ({ find: jest.fn().mockResolvedValue([]) })),
    };
    const service = new ShiftsService(dataSource as never, repoStub() as never, repoStub({ id: 'shift-1', tenantId, status: 'CLOSED' }) as never, repoStub() as never, repoStub() as never, { record: jest.fn() } as never);

    await service.close(
      tenantId,
      'shift-1',
      { closing_readings: [{ nozzle_id: 'nozzle-1', meter_reading: 20 }], cash_submissions: [{ pumper_id: 'pumper-1', actual_cash: 3000 }] },
      actorUserId,
    );

    expect(saved).toContainEqual(expect.objectContaining({ __entity: SalaryDeduction.name, status: 'APPROVED' }));
  });

  it('excludes pending approval deductions from payroll finalization', async () => {
    const approvedDeduction: { id: string; amount: string; payrollRunId?: string } = { id: 'deduction-approved', amount: '125.00' };
    const pendingDeduction: { id: string; amount: string; payrollRunId?: string } = { id: 'deduction-pending', amount: '500.00' };
    const saved: Array<{ __entity?: string; id?: string; payrollRunId?: string; deductionAmount?: string; status?: string }> = [];
    const manager = {
      findOne: jest.fn(async (entity: EntityTarget) => {
        if (entity === PayrollRun) return { id: 'payroll-1', periodStart: '2026-05-01', periodEnd: '2026-05-19', status: 'DRAFT' };
        return undefined;
      }),
      find: jest.fn(async (entity: EntityTarget) => {
        if (entity === StaffProfile) return [{ id: 'staff-1', basicSalary: '1000.00', shiftRate: '100.00', status: 'ACTIVE' }];
        return [];
      }),
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => attendanceQueryBuilder(0)),
      })),
      createQueryBuilder: jest.fn(() => salaryDeductionQueryBuilder([approvedDeduction])),
      create: jest.fn(managerCreate),
      save: jest.fn(async (value: { __entity?: string; id?: string; payrollRunId?: string }) => {
        if (value.id === approvedDeduction.id) approvedDeduction.payrollRunId = value.payrollRunId;
        saved.push(value);
        return value;
      }),
    };
    const dataSource = { transaction: jest.fn((callback: (m: typeof manager) => Promise<unknown>) => callback(manager)) };
    const service = new PayrollService(dataSource as never, repoStub() as never, repoStub() as never, { record: jest.fn() } as never);

    await service.finalizeRun(tenantId, 'payroll-1', { attendance_override: false }, actorUserId);

    expect(saved).toContainEqual(expect.objectContaining({ __entity: PayrollRunLine.name, deductionAmount: '125.00' }));
    expect(approvedDeduction.payrollRunId).toBe('payroll-1');
    expect(pendingDeduction.payrollRunId).toBeUndefined();
  });

  it('rotates refresh tokens by cookie token only and revokes the family on replay', async () => {
    const rows: Array<{ userId: string; tenantId: string; tokenHash: string; familyId: string; expiresAt: Date; revokedAt?: Date }> = [];
    const queryBuilder: any = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn((value: { revokedAt: Date }) => {
        rows.filter((row) => row.familyId === '11111111-1111-4111-8111-111111111111' && !row.revokedAt).forEach((row) => {
          row.revokedAt = value.revokedAt;
        });
        return queryBuilder;
      }),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const repository = {
      create: jest.fn((value: { userId: string; tenantId: string; tokenHash: string; familyId: string; expiresAt: Date }) => value),
      save: jest.fn(async (value: { userId: string; tenantId: string; tokenHash: string; familyId: string; expiresAt: Date; revokedAt?: Date }) => {
        if (!rows.includes(value)) rows.push(value);
        return value;
      }),
      findOne: jest.fn(async ({ where }: { where: { tokenHash: string } }) => rows.find((row) => row.tokenHash === where.tokenHash)),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };
    const service = new RefreshTokenService(repository as never);

    const familyId = '11111111-1111-4111-8111-111111111111';
    const first = await service.issueRefreshToken(actorUserId, tenantId, familyId);
    const rotated = await service.rotateRefreshToken(first);
    const second = rotated.refreshToken;

    expect(second).not.toBe(first);
    expect(rows).toHaveLength(2);
    expect(rows[1].familyId).toBe(familyId);
    expect(rows[0].revokedAt).toBeInstanceOf(Date);
    await expect(service.findValid(first)).rejects.toThrow(UnauthorizedException);
    expect(rows[1].revokedAt).toBeInstanceOf(Date);
    expect(rows[1].tokenHash).toBe(crypto.createHash('sha256').update(second).digest('hex'));
  });
});

function shiftCloseManager(saved: Array<{ __entity?: string; status?: string; isRollover?: boolean }>, approvalSetting: 'true' | 'false') {
  return {
    find: jest.fn(async (entity: EntityTarget) => {
      if (entity === PumpNozzleAssignment) return [{ nozzleId: 'nozzle-1', pumperId: 'pumper-1' }];
      return [];
    }),
    findOne: jest.fn(async (entity: EntityTarget) => {
      if (entity === ShiftSession) return { id: 'shift-1', tenantId: 'tenant-1', status: 'ACTIVE' };
      if (entity === PumpMeterReading) return { openingReading: '99990.000', nozzleId: 'nozzle-1' };
      if (entity === PumpNozzle) return { id: 'nozzle-1', pumpId: 'pump-1', productId: 'fuel-1', meterCapacity: '99999.999' };
      if (entity === TenantSetting) return { settingKey: 'cash_shortfall_requires_approval', settingValue: approvalSetting };
      if (entity === StockBalance) return { tenantId: 'tenant-1', productId: 'fuel-1', quantityOnHand: '1000.000' };
      return undefined;
    }),
    getRepository: jest.fn((entity: EntityTarget) => {
      if (entity === ProductPrice) {
        return {
          createQueryBuilder: jest.fn(() => productPriceQueryBuilder()),
        };
      }
      if (entity === TenantSetting) {
        return {
          findOne: jest.fn(async ({ where }: { where: { settingKey: string } }) => {
            if (where.settingKey === 'cash_shortfall_requires_approval') {
              return { settingKey: where.settingKey, settingValue: approvalSetting };
            }
            if (where.settingKey === 'salary_deduction_enabled') {
              return { settingKey: where.settingKey, settingValue: 'true' };
            }
            return undefined;
          }),
        };
      }
      return {};
    }),
    create: jest.fn(managerCreate),
    save: jest.fn(async (value: { __entity?: string; id?: string; status?: string; isRollover?: boolean }) => {
      const withId = { id: value.id ?? `${value.__entity ?? 'row'}-${saved.length + 1}`, ...value };
      saved.push(withId);
      return withId;
    }),
  };
}

function productPriceQueryBuilder() {
  const builder: Record<string, jest.Mock> = {};
  builder.where = jest.fn(() => builder);
  builder.andWhere = jest.fn(() => builder);
  builder.orderBy = jest.fn(() => builder);
  builder.getOne = jest.fn(async () => ({ sellingPrice: '370.00' }));
  return builder;
}

function attendanceQueryBuilder(count: number) {
  const builder: Record<string, jest.Mock> = {};
  builder.innerJoin = jest.fn(() => builder);
  builder.where = jest.fn(() => builder);
  builder.andWhere = jest.fn(() => builder);
  builder.getCount = jest.fn(async () => count);
  return builder;
}

function salaryDeductionQueryBuilder(rows: Array<{ id: string; amount: string; payrollRunId?: string }>) {
  const builder: Record<string, jest.Mock> = {};
  builder.where = jest.fn(() => builder);
  builder.andWhere = jest.fn(() => builder);
  builder.getMany = jest.fn(async () => rows);
  return builder;
}
