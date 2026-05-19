import { NotFoundException } from '@nestjs/common';
import { ChequesService } from '../src/modules/cheques/cheques.service';
import { ProductsService } from '../src/modules/products/products.service';
import { PumpsService } from '../src/modules/pumps/pumps.service';
import { ReportsService } from '../src/modules/reports/reports.service';
import { ShiftsService } from '../src/modules/shifts/shifts.service';
import { StaffService } from '../src/modules/staff/staff.service';

function repoStub() {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  return {
    qb,
    findOne: jest.fn().mockResolvedValue(undefined),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
    createQueryBuilder: jest.fn(() => qb),
  };
}

describe('cross-tenant isolation', () => {
  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';
  const foreignId = 'resource-from-tenant-a';
  const actorUserId = 'user-b';

  it('returns not found when Tenant B updates a Tenant A product id', async () => {
    const products = repoStub();
    const service = new ProductsService({} as never, products as never, repoStub() as never, repoStub() as never, { record: jest.fn() } as never);

    await expect(service.update(tenantB, foreignId, { product_name: 'Blocked' }, actorUserId)).rejects.toThrow(NotFoundException);
    expect(products.findOne).toHaveBeenCalledWith({ where: { tenantId: tenantB, id: foreignId } });
  });

  it('returns not found when Tenant B reads or updates a Tenant A staff id', async () => {
    const staff = repoStub();
    const service = new StaffService(staff as never, repoStub() as never, { record: jest.fn() } as never);

    await expect(service.findOne(tenantB, foreignId)).rejects.toThrow(NotFoundException);
    await expect(service.update(tenantB, foreignId, { name: 'Blocked' }, actorUserId)).rejects.toThrow(NotFoundException);
    expect(staff.findOne).toHaveBeenCalledWith({ where: { tenantId: tenantB, id: foreignId }, relations: { operationalRole: true } });
  });

  it('returns not found when Tenant B updates Tenant A pump or nozzle ids', async () => {
    const pumps = repoStub();
    const nozzles = repoStub();
    const service = new PumpsService({} as never, pumps as never, nozzles as never, repoStub() as never, { record: jest.fn() } as never);

    await expect(service.update(tenantB, foreignId, { pump_name: 'Blocked' }, actorUserId)).rejects.toThrow(NotFoundException);
    await expect(service.updateNozzle(tenantB, foreignId, { nozzle_name: 'Blocked' }, actorUserId)).rejects.toThrow(NotFoundException);
    expect(pumps.findOne).toHaveBeenCalledWith({ where: { tenantId: tenantB, id: foreignId } });
    expect(nozzles.findOne).toHaveBeenCalledWith({ where: { tenantId: tenantB, id: foreignId } });
  });

  it('returns not found when Tenant B reads or opens a Tenant A shift session id', async () => {
    const sessions = repoStub();
    const service = new ShiftsService({} as never, repoStub() as never, sessions as never, repoStub() as never, repoStub() as never, { record: jest.fn() } as never);

    await expect(service.findSession(tenantB, foreignId)).rejects.toThrow(NotFoundException);
    await expect(service.openSession(tenantB, foreignId, actorUserId)).rejects.toThrow(NotFoundException);
    expect(sessions.findOne).toHaveBeenCalledWith({ where: { tenantId: tenantB, id: foreignId } });
  });

  it('returns not found when Tenant B updates a Tenant A cheque id', async () => {
    const cheques = repoStub();
    const service = new ChequesService(cheques as never, { record: jest.fn() } as never);

    await expect(service.updateStatus(tenantB, foreignId, { status: 'DEPOSITED' }, actorUserId)).rejects.toThrow(NotFoundException);
    expect(cheques.findOne).toHaveBeenCalledWith({ where: { tenantId: tenantB, id: foreignId } });
  });

  it('applies tenant filters to list queries and raw SQL reports', async () => {
    const products = repoStub();
    const staff = repoStub();
    const cheques = repoStub();
    new ProductsService({} as never, products as never, repoStub() as never, repoStub() as never, { record: jest.fn() } as never).list(tenantA, { page: 1, limit: 25 });
    new StaffService(staff as never, repoStub() as never, { record: jest.fn() } as never).list(tenantA, { page: 1, limit: 25 });
    new ChequesService(cheques as never, { record: jest.fn() } as never).list(tenantA, { page: 1, limit: 25 });

    expect(products.qb.where).toHaveBeenCalledWith('product.tenantId = :tenantId', { tenantId: tenantA });
    expect(staff.qb.where).toHaveBeenCalledWith('staff.tenantId = :tenantId', { tenantId: tenantA });
    expect(cheques.qb.where).toHaveBeenCalledWith('cheque.tenantId = :tenantId', { tenantId: tenantA });

    const dataSource = { query: jest.fn().mockResolvedValue([{ value: 0 }]) };
    const reports = new ReportsService(dataSource as never);
    await reports.profitLoss(tenantB, { page: 1, limit: 25 });

    for (const call of dataSource.query.mock.calls) {
      expect(call[1]).toContain(tenantB);
      expect(call[1]).not.toContain(tenantA);
    }
  });
});
