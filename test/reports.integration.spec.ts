import { QueryRunner } from 'typeorm';
import dataSource from '../src/database/data-source';
import { ReportsService } from '../src/modules/reports/reports.service';

interface ReportFixture {
  tenantId: string;
  otherTenantId: string;
  productId: string;
  staffId: string;
  shiftSessionId: string;
}

interface TransactionContext {
  reports: ReportsService;
  fixture: ReportFixture;
  queryRunner: QueryRunner;
}

describe('ReportsService integration', () => {
  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('builds the dashboard from seeded tenant data only', async () => {
    await withReportTransaction(async ({ reports, fixture }) => {
      const result = await reports.dashboard(fixture.tenantId);

      expect(result.today_sales).toBe(7400);
      expect(result.active_shift_count).toBe(1);
      expect(result.cash_shortfall_count).toBe(1);
      expect(result.pending_approvals).toBe(1);
      expect(result.credit_outstanding).toBe(1250);
      expect(result.cheques_pending).toBe(1);
      expect(result.fuel_stock_summary).toEqual([
        expect.objectContaining({
          product_code: expect.stringMatching(/^PET-/),
          product_name: 'Petrol 92 Report Fixture',
          category: 'FUEL',
        }),
      ]);
    });
  });

  it('calculates daily sales totals from pumper cash submissions', async () => {
    await withReportTransaction(async ({ reports, fixture }) => {
      const result = await reports.dailySales(fixture.tenantId, { page: 1, limit: 25, sort_order: 'ASC' });

      expect(result.meta.total).toBe(1);
      expect(result.data[0]).toEqual(expect.objectContaining({
        business_date: expect.any(Date),
        expected_cash: '7400.00',
        actual_cash: '7000.00',
        shortfall: '400.00',
        excess: '0.00',
        shift_count: 1,
      }));
    });
  });

  it('returns stock rows for the requested tenant', async () => {
    await withReportTransaction(async ({ reports, fixture }) => {
      const result = await reports.stock(fixture.tenantId, { page: 1, limit: 25, sort_order: 'ASC' });

      expect(result.meta.total).toBe(1);
      expect(result.data[0]).toEqual(expect.objectContaining({
        product_id: fixture.productId,
        product_name: 'Petrol 92 Report Fixture',
        quantity_on_hand: '990.000',
      }));
    });
  });

  it('reads pump meters using the migrated single-row meter schema', async () => {
    await withReportTransaction(async ({ reports, fixture }) => {
      const result = await reports.pumpMeters(fixture.tenantId, { page: 1, limit: 25, sort_order: 'ASC' });

      expect(result.meta.total).toBe(1);
      expect(result.data[0]).toEqual(expect.objectContaining({
        business_date: expect.any(Date),
        product_name: 'Petrol 92 Report Fixture',
        pumper_name: 'Report Pumper',
        opening_reading: '99990.000',
        closing_reading: '0.050',
        is_rollover: true,
        dispensed_litres: '10.050',
        expected_cash: '3718.50',
        reading_status: 'CLOSED',
      }));
    });
  });

  it('calculates profit and loss without leaking another tenant data', async () => {
    await withReportTransaction(async ({ reports, fixture }) => {
      const result = await reports.profitLoss(fixture.tenantId, { page: 1, limit: 25 });
      const otherTenantResult = await reports.profitLoss(fixture.otherTenantId, { page: 1, limit: 25 });

      expect(result).toEqual(expect.objectContaining({
        revenue: 7400,
        supplier_payments: 3000,
        approved_deductions: 100,
        gross_profit_estimate: 4400,
        net_profit_estimate: 4300,
        credit_outstanding: 1250,
      }));
      expect(otherTenantResult).toEqual(expect.objectContaining({
        revenue: 99999,
        supplier_payments: 0,
        approved_deductions: 0,
        credit_outstanding: 0,
      }));
    });
  });
});

async function withReportTransaction(testBody: (context: TransactionContext) => Promise<void>) {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const fixture = await seedReportFixture(queryRunner);
    const reports = new ReportsService(serializedQueryDataSource(queryRunner) as never);
    await testBody({ reports, fixture, queryRunner });
  } finally {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  }
}

function serializedQueryDataSource(queryRunner: QueryRunner) {
  let queue = Promise.resolve();
  return {
    query(sql: string, params?: unknown[]) {
      const next = queue.then(() => queryRunner.query(sql, params));
      queue = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
  };
}

async function seedReportFixture(queryRunner: QueryRunner): Promise<ReportFixture> {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const tenantId = await insertTenant(queryRunner, `RPT-${suffix}`, 'Report Test Tenant');
  const otherTenantId = await insertTenant(queryRunner, `RPT-OTHER-${suffix}`, 'Other Report Tenant');
  const userId = await insertPortalUser(queryRunner, tenantId, `report-${suffix}@demo.cpc`);
  const roleId = await insertRole(queryRunner, tenantId, `Pumper-${suffix}`);
  const staffId = await insertStaff(queryRunner, tenantId, roleId, `EMP-${suffix}`);
  const unitId = await insertMeasurementUnit(queryRunner, `LTR-${suffix}`);
  const productId = await insertProduct(queryRunner, tenantId, unitId, `PET-${suffix}`);
  const otherProductId = await insertProduct(queryRunner, otherTenantId, unitId, `PET-OTHER-${suffix}`);
  const shiftTemplateId = await insertShiftTemplate(queryRunner, tenantId, `Morning-${suffix}`);
  const shiftSessionId = await insertShiftSession(queryRunner, tenantId, shiftTemplateId, staffId, userId);
  const pumpId = await insertPump(queryRunner, tenantId, `P-${suffix}`);
  const nozzleId = await insertNozzle(queryRunner, tenantId, pumpId, productId, `N-${suffix}`);

  await queryRunner.query(
    `insert into stock_balances (tenant_id, product_id, quantity_on_hand) values ($1, $2, 990.000)`,
    [tenantId, productId],
  );
  await queryRunner.query(
    `insert into stock_balances (tenant_id, product_id, quantity_on_hand) values ($1, $2, 123.000)`,
    [otherTenantId, otherProductId],
  );
  await queryRunner.query(
    `insert into pump_meter_readings (
       tenant_id, shift_session_id, pump_id, nozzle_id, fuel_product_id, pumper_id,
       opening_reading, closing_reading, is_rollover, dispensed_litres, unit_price, expected_cash, status, recorded_by
     ) values ($1, $2, $3, $4, $5, $6, 99990.000, 0.050, true, 10.050, 370.00, 3718.50, 'CLOSED', $7)`,
    [tenantId, shiftSessionId, pumpId, nozzleId, productId, staffId, userId],
  );
  await queryRunner.query(
    `insert into pumper_cash_submissions (
       tenant_id, shift_session_id, pumper_id, expected_cash, actual_cash, variance, shortfall, excess, status
     ) values ($1, $2, $3, 7400.00, 7000.00, -400.00, 400.00, 0.00, 'SUBMITTED')`,
    [tenantId, shiftSessionId, staffId],
  );
  await queryRunner.query(
    `insert into pumper_cash_submissions (
       tenant_id, shift_session_id, pumper_id, expected_cash, actual_cash, variance, shortfall, excess, status
     ) values ($1, $2, $3, 99999.00, 99999.00, 0.00, 0.00, 0.00, 'SUBMITTED')`,
    [otherTenantId, shiftSessionId, staffId],
  );
  await queryRunner.query(
    `insert into salary_deductions (tenant_id, staff_id, shift_session_id, source_type, amount, status, reason)
     values ($1, $2, $3, 'CASH_SHORTFALL', 400.00, 'PENDING_APPROVAL', 'Report fixture')`,
    [tenantId, staffId, shiftSessionId],
  );
  await queryRunner.query(
    `insert into salary_deductions (tenant_id, staff_id, shift_session_id, source_type, amount, status, reason)
     values ($1, $2, $3, 'MANUAL', 100.00, 'APPROVED', 'Report fixture')`,
    [tenantId, staffId, shiftSessionId],
  );
  await queryRunner.query(
    `insert into supplier_payments (tenant_id, payment_type, amount, payment_date, status, created_by)
     values ($1, 'CASH', 3000.00, current_date, 'RECORDED', $2)`,
    [tenantId, userId],
  );
  const customerId = await insertCreditCustomer(queryRunner, tenantId, `Customer-${suffix}`, '1250.00');
  await queryRunner.query(
    `insert into cheque_registry (tenant_id, customer_id, cheque_no, bank_name, amount, received_date, status, created_by)
     values ($1, $2, $3, 'Report Bank', 500.00, current_date, 'RECEIVED', $4)`,
    [tenantId, customerId, `CHQ-${suffix}`, userId],
  );

  return { tenantId, otherTenantId, productId, staffId, shiftSessionId };
}

async function insertTenant(queryRunner: QueryRunner, stationCode: string, stationName: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into tenants (station_code, station_name, status) values ($1, $2, 'ACTIVE') returning id`,
    [stationCode, stationName],
  );
  return rows[0].id;
}

async function insertPortalUser(queryRunner: QueryRunner, tenantId: string, email: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into portal_users (tenant_id, name, email, password_hash, portal_role, status)
     values ($1, 'Report Admin', $2, 'hash', 'ADMIN', 'ACTIVE') returning id`,
    [tenantId, email],
  );
  return rows[0].id;
}

async function insertRole(queryRunner: QueryRunner, tenantId: string, name: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into operational_roles (tenant_id, name, requires_attendance, liable_for_cash_shortfall, status)
     values ($1, $2, true, true, 'ACTIVE') returning id`,
    [tenantId, name],
  );
  return rows[0].id;
}

async function insertStaff(queryRunner: QueryRunner, tenantId: string, roleId: string, employeeNo: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into staff_profiles (tenant_id, employee_no, name, operational_role_id, basic_salary, shift_rate, ot_rate, status, joined_date)
     values ($1, $2, 'Report Pumper', $3, 1000.00, 100.00, 0.00, 'ACTIVE', current_date) returning id`,
    [tenantId, employeeNo, roleId],
  );
  return rows[0].id;
}

async function insertMeasurementUnit(queryRunner: QueryRunner, code: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into measurement_units (code, name, decimal_precision) values ($1, 'Litres', 3) returning id`,
    [code],
  );
  return rows[0].id;
}

async function insertProduct(queryRunner: QueryRunner, tenantId: string, unitId: string, productCode: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into products (tenant_id, product_code, product_name, category, measurement_unit_id, is_fuel, status)
     values ($1, $2, 'Petrol 92 Report Fixture', 'FUEL', $3, true, 'ACTIVE') returning id`,
    [tenantId, productCode, unitId],
  );
  return rows[0].id;
}

async function insertShiftTemplate(queryRunner: QueryRunner, tenantId: string, name: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into shift_templates (tenant_id, shift_name, start_time, end_time, sequence_no, status)
     values ($1, $2, '08:00', '16:00', 1, 'ACTIVE') returning id`,
    [tenantId, name],
  );
  return rows[0].id;
}

async function insertShiftSession(queryRunner: QueryRunner, tenantId: string, shiftTemplateId: string, managerId: string, userId: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into shift_sessions (tenant_id, shift_template_id, business_date, manager_id, opened_by, status, opened_at)
     values ($1, $2, current_date, $3, $4, 'ACTIVE', now()) returning id`,
    [tenantId, shiftTemplateId, managerId, userId],
  );
  return rows[0].id;
}

async function insertPump(queryRunner: QueryRunner, tenantId: string, pumpCode: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into pumps (tenant_id, pump_code, pump_name, status) values ($1, $2, 'Report Pump', 'ACTIVE') returning id`,
    [tenantId, pumpCode],
  );
  return rows[0].id;
}

async function insertNozzle(queryRunner: QueryRunner, tenantId: string, pumpId: string, productId: string, nozzleCode: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into pump_nozzles (tenant_id, pump_id, product_id, nozzle_name, nozzle_code, status)
     values ($1, $2, $3, 'Report Nozzle', $4, 'ACTIVE') returning id`,
    [tenantId, pumpId, productId, nozzleCode],
  );
  return rows[0].id;
}

async function insertCreditCustomer(queryRunner: QueryRunner, tenantId: string, customerName: string, outstandingBalance: string): Promise<string> {
  const rows = await queryRunner.query(
    `insert into credit_customers (tenant_id, customer_name, outstanding_balance, status)
     values ($1, $2, $3, 'ACTIVE') returning id`,
    [tenantId, customerName, outstandingBalance],
  );
  return rows[0].id;
}
