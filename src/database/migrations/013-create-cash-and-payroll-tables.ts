import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCashAndPayrollTables1710000000013 implements MigrationInterface {
  name = 'CreateCashAndPayrollTables1710000000013';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE salary_deductions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        staff_id UUID NOT NULL REFERENCES staff_profiles(id),
        shift_session_id UUID REFERENCES shift_sessions(id),
        source_type VARCHAR(50) NOT NULL,
        source_id UUID,
        amount NUMERIC(12,2) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
        approved_by UUID REFERENCES portal_users(id),
        approved_at TIMESTAMPTZ,
        reason TEXT,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE daily_cash_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        business_date DATE NOT NULL,
        opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
        expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
        actual_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
        shortfall NUMERIC(12,2) NOT NULL DEFAULT 0,
        excess NUMERIC(12,2) NOT NULL DEFAULT 0,
        bank_deposit NUMERIC(12,2) NOT NULL DEFAULT 0,
        closing_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, business_date)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE payroll_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        created_by UUID REFERENCES portal_users(id),
        finalized_by UUID REFERENCES portal_users(id),
        finalized_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE payroll_run_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id),
        staff_id UUID NOT NULL REFERENCES staff_profiles(id),
        gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        deduction_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        net_amount NUMERIC(12,2) NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_salary_deductions_tenant_id ON salary_deductions(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_salary_deductions_tenant_status ON salary_deductions(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_daily_cash_balances_tenant_id ON daily_cash_balances(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_daily_cash_balances_tenant_date ON daily_cash_balances(tenant_id, business_date)`);
    await queryRunner.query(`CREATE INDEX idx_payroll_runs_tenant_id ON payroll_runs(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_payroll_run_lines_tenant_id ON payroll_run_lines(tenant_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE payroll_run_lines`);
    await queryRunner.query(`DROP TABLE payroll_runs`);
    await queryRunner.query(`DROP TABLE daily_cash_balances`);
    await queryRunner.query(`DROP TABLE salary_deductions`);
  }
}
