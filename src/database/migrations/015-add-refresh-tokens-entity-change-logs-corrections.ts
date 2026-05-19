import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokensEntityChangeLogsCorrections1710000000015 implements MigrationInterface {
  name = 'AddRefreshTokensEntityChangeLogsCorrections1710000000015';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add updated_by to tables that have updated_at
    for (const table of [
      'tenants', 'tenant_settings', 'portal_users', 'operational_roles', 'staff_profiles',
      'shift_templates', 'shift_sessions', 'staff_shift_attendance', 'pumps', 'pump_nozzles',
      'pump_nozzle_assignments', 'pumper_cash_submissions', 'salary_deductions',
      'stock_balances', 'fuel_tanks', 'bowser_receipts', 'stock_orders',
      'credit_customers', 'cheque_registry', 'daily_cash_balances', 'payroll_runs',
    ]) {
      await queryRunner.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES portal_users(id)`);
    }

    // Add meter_capacity to pump_nozzles
    await queryRunner.query(`ALTER TABLE pump_nozzles ADD COLUMN IF NOT EXISTS meter_capacity NUMERIC(14,3) NOT NULL DEFAULT 99999.999`);

    // Migrate pump_meter_readings from two-row to single-row schema
    // First rename old table, create new one, migrate data, drop old
    await queryRunner.query(`ALTER TABLE pump_meter_readings RENAME TO pump_meter_readings_old`);
    // The old table's indexes keep their original names after the table rename.
    // Drop this one before creating the replacement table index with the same name.
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pump_meter_readings_tenant_id`);
    await queryRunner.query(`
      CREATE TABLE pump_meter_readings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shift_session_id UUID NOT NULL REFERENCES shift_sessions(id),
        pump_id UUID NOT NULL REFERENCES pumps(id),
        nozzle_id UUID NOT NULL REFERENCES pump_nozzles(id),
        fuel_product_id UUID NOT NULL REFERENCES products(id),
        pumper_id UUID REFERENCES staff_profiles(id),
        opening_reading NUMERIC(14,3) NOT NULL,
        closing_reading NUMERIC(14,3),
        is_rollover BOOLEAN NOT NULL DEFAULT false,
        dispensed_litres NUMERIC(14,3),
        unit_price NUMERIC(12,2),
        expected_cash NUMERIC(12,2),
        status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        recorded_by UUID REFERENCES portal_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by UUID REFERENCES portal_users(id),
        UNIQUE (tenant_id, shift_session_id, nozzle_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pump_meter_readings_tenant_id ON pump_meter_readings(tenant_id)`);

    // Migrate existing opening readings
    await queryRunner.query(`
      INSERT INTO pump_meter_readings (tenant_id, shift_session_id, pump_id, nozzle_id, fuel_product_id, pumper_id, opening_reading, recorded_by, created_at)
      SELECT o.tenant_id, o.shift_session_id,
             n.pump_id,
             o.nozzle_id,
             n.product_id,
             o.pumper_id,
             o.meter_reading::numeric,
             o.recorded_by,
             o.recorded_at
      FROM pump_meter_readings_old o
      JOIN pump_nozzles n ON n.id = o.nozzle_id
      WHERE o.reading_type = 'OPENING'
      ON CONFLICT (tenant_id, shift_session_id, nozzle_id) DO NOTHING
    `);

    // Migrate closing readings into same row
    await queryRunner.query(`
      UPDATE pump_meter_readings pmr
      SET closing_reading = c.meter_reading::numeric,
          status = 'CLOSED'
      FROM pump_meter_readings_old c
      WHERE c.nozzle_id = pmr.nozzle_id
        AND c.shift_session_id = pmr.shift_session_id
        AND c.tenant_id = pmr.tenant_id
        AND c.reading_type = 'CLOSING'
    `);

    await queryRunner.query(`DROP TABLE pump_meter_readings_old`);

    // Add payroll_run_id to salary_deductions
    await queryRunner.query(`ALTER TABLE salary_deductions ADD COLUMN IF NOT EXISTS payroll_run_id UUID REFERENCES payroll_runs(id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_salary_deductions_payroll_run ON salary_deductions(payroll_run_id)`);

    // Add shift_count to payroll_run_lines
    await queryRunner.query(`ALTER TABLE payroll_run_lines ADD COLUMN IF NOT EXISTS shift_count INT NOT NULL DEFAULT 0`);

    // Add deleted_at soft delete to financial tables
    await queryRunner.query(`ALTER TABLE credit_sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE due_collections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE cheque_registry ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE daily_cash_balances ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);

    // portal_user_refresh_tokens
    await queryRunner.query(`
      CREATE TABLE portal_user_refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES portal_users(id),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portal_user_refresh_tokens_user ON portal_user_refresh_tokens(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_portal_user_refresh_tokens_tenant ON portal_user_refresh_tokens(tenant_id)`);

    // entity_change_logs
    await queryRunner.query(`
      CREATE TABLE entity_change_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        actor_user_id UUID REFERENCES portal_users(id),
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(20) NOT NULL,
        changed_fields JSONB,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_entity_change_logs_entity ON entity_change_logs(entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX idx_entity_change_logs_tenant_date ON entity_change_logs(tenant_id, created_at)`);

    // shift_correction_requests
    await queryRunner.query(`
      CREATE TABLE shift_correction_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shift_session_id UUID NOT NULL REFERENCES shift_sessions(id),
        correction_type VARCHAR(50) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        old_value JSONB NOT NULL,
        new_value JSONB NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        requested_by UUID NOT NULL REFERENCES portal_users(id),
        approved_by UUID REFERENCES portal_users(id),
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by UUID REFERENCES portal_users(id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_shift_correction_requests_tenant ON shift_correction_requests(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_shift_correction_requests_session ON shift_correction_requests(shift_session_id)`);

    // Missing indexes from requirements §8
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_shift_sessions_tenant_date ON shift_sessions(tenant_id, business_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_daily_cash_balances_tenant_date ON daily_cash_balances(tenant_id, business_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_date ON stock_movements(tenant_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_shift_sessions_tenant_status ON shift_sessions(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_salary_deductions_tenant_status ON salary_deductions(tenant_id, status)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS shift_correction_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS entity_change_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS portal_user_refresh_tokens`);
    await queryRunner.query(`ALTER TABLE payroll_run_lines DROP COLUMN IF EXISTS shift_count`);
    await queryRunner.query(`ALTER TABLE salary_deductions DROP COLUMN IF EXISTS payroll_run_id`);
    await queryRunner.query(`ALTER TABLE credit_sales DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE due_collections DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE cheque_registry DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE daily_cash_balances DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE pump_nozzles DROP COLUMN IF EXISTS meter_capacity`);
    // Note: pump_meter_readings schema change is not reversible in down() without data backup
  }
}
