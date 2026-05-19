import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import {
  MeasurementUnit,
  OperationalRole,
  PortalUser,
  Product,
  ProductPrice,
  Pump,
  PumpNozzle,
  ShiftTemplate,
  StockBalance,
  Tenant,
  TenantSetting,
} from '../entities';
import { PortalRole } from '../../common/enums/portal-role.enum';

const settings: Record<string, string> = {
  salary_deduction_enabled: 'true',
  cash_shortfall_requires_approval: 'true',
  night_shift_enabled: 'false',
  night_stock_verification_required: 'true',
  allow_shift_overlap: 'false',
  currency: 'LKR',
  timezone: 'Asia/Colombo',
  cpc_report_format: 'DEFAULT',
};

async function seed() {
  await dataSource.initialize();
  const manager = dataSource.manager;

  await manager.upsert(MeasurementUnit, [
    { code: 'LITRE', name: 'Litre', decimalPrecision: 3 },
    { code: 'UNIT', name: 'Unit', decimalPrecision: 0 },
  ], ['code']);

  if (process.env.SEED_DEMO !== 'true') {
    await dataSource.destroy();
    return;
  }

  const stationCode = process.env.DEMO_STATION_CODE ?? 'CPC001';
  let tenant = await manager.findOne(Tenant, { where: { stationCode } });
  if (!tenant) {
    tenant = await manager.save(
      manager.create(Tenant, {
        stationCode,
        stationName: 'CPC Colombo Demo Station',
        ownerName: 'Demo Owner',
        district: 'Colombo',
        contactNumber: '+94110000000',
        email: 'owner@demo.cpc',
      }),
    );
  }

  for (const [settingKey, settingValue] of Object.entries(settings)) {
    const existing = await manager.findOne(TenantSetting, { where: { tenantId: tenant.id, settingKey } });
    await manager.save(manager.create(TenantSetting, { ...existing, tenantId: tenant.id, settingKey, settingValue }));
  }

  for (const role of [
    { name: 'Manager', requiresAttendance: true, liableForCashShortfall: false },
    { name: 'Pumper', requiresAttendance: true, liableForCashShortfall: true },
    { name: 'Accountant', requiresAttendance: false, liableForCashShortfall: false },
  ]) {
    const existing = await manager.findOne(OperationalRole, { where: { tenantId: tenant.id, name: role.name } });
    await manager.save(manager.create(OperationalRole, { ...existing, tenantId: tenant.id, ...role }));
  }

  const adminEmail = (process.env.DEMO_ADMIN_EMAIL ?? 'admin@demo.cpc').toLowerCase();
  const existingUser = await manager.findOne(PortalUser, { where: { tenantId: tenant.id, email: adminEmail } });
  if (!existingUser) {
    await manager.save(
      manager.create(PortalUser, {
        tenantId: tenant.id,
        name: 'Demo Admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash(process.env.DEMO_ADMIN_PASSWORD ?? 'Admin12345!', 12),
        portalRole: PortalRole.Admin,
      }),
    );
  }

  const litre = await manager.findOneByOrFail(MeasurementUnit, { code: 'LITRE' });
  const unit = await manager.findOneByOrFail(MeasurementUnit, { code: 'UNIT' });
  const productSeeds = [
    ['PETROL', 'Petrol', 'FUEL', litre.id, '370.00'],
    ['DIESEL', 'Diesel', 'FUEL', litre.id, '360.00'],
    ['KEROSENE', 'Kerosene', 'FUEL', litre.id, '260.00'],
    ['GAS-CYL', 'Gas Cylinder', 'GAS', unit.id, '5500.00'],
    ['OB-OIL', 'OB Oil', 'LUBRICANT', unit.id, '650.00'],
    ['2T-OIL', '2T Oil', 'LUBRICANT', unit.id, '720.00'],
  ] as const;

  for (const [productCode, productName, category, measurementUnitId, price] of productSeeds) {
    let product = await manager.findOne(Product, { where: { tenantId: tenant.id, productCode } });
    if (!product) {
      product = await manager.save(
        manager.create(Product, {
          tenantId: tenant.id,
          productCode,
          productName,
          category,
          measurementUnitId,
          isFuel: category === 'FUEL',
          isGas: category === 'GAS',
          isLubricant: category === 'LUBRICANT',
        }),
      );
      await manager.save(manager.create(StockBalance, { tenantId: tenant.id, productId: product.id, quantityOnHand: category === 'FUEL' ? '10000.000' : '100.000' }));
    }
    const existingPrice = await manager.findOne(ProductPrice, { where: { tenantId: tenant.id, productId: product.id, status: 'ACTIVE' } });
    if (!existingPrice) {
      await manager.save(manager.create(ProductPrice, { tenantId: tenant.id, productId: product.id, sellingPrice: price, effectiveFrom: new Date(), status: 'ACTIVE' }));
    }
  }

  for (const template of [
    { shiftName: 'Shift 1', startTime: '08:00', endTime: '13:30', sequenceNo: 1 },
    { shiftName: 'Shift 2', startTime: '13:30', endTime: '21:00', sequenceNo: 2 },
  ]) {
    const existing = await manager.findOne(ShiftTemplate, { where: { tenantId: tenant.id, shiftName: template.shiftName } });
    await manager.save(manager.create(ShiftTemplate, { ...existing, tenantId: tenant.id, ...template }));
  }

  const petrol = await manager.findOneByOrFail(Product, { tenantId: tenant.id, productCode: 'PETROL' });
  const diesel = await manager.findOneByOrFail(Product, { tenantId: tenant.id, productCode: 'DIESEL' });
  let pump = await manager.findOne(Pump, { where: { tenantId: tenant.id, pumpCode: 'P1' } });
  if (!pump) {
    pump = await manager.save(manager.create(Pump, { tenantId: tenant.id, pumpCode: 'P1', pumpName: 'Pump 1' }));
    await manager.save([
      manager.create(PumpNozzle, { tenantId: tenant.id, pumpId: pump.id, nozzleCode: 'P1-A', nozzleName: 'Pump 1 Petrol', productId: petrol.id }),
      manager.create(PumpNozzle, { tenantId: tenant.id, pumpId: pump.id, nozzleCode: 'P1-B', nozzleName: 'Pump 1 Diesel', productId: diesel.id }),
    ]);
  }

  await dataSource.destroy();
}

seed().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
