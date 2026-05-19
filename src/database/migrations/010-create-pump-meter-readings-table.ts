import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePumpMeterReadingsTable1710000000010 implements MigrationInterface {
  name = 'CreatePumpMeterReadingsTable1710000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pump_nozzle_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shift_session_id UUID NOT NULL REFERENCES shift_sessions(id),
        nozzle_id UUID NOT NULL REFERENCES pump_nozzles(id),
        pumper_id UUID NOT NULL REFERENCES staff_profiles(id),
        assigned_by UUID REFERENCES portal_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, shift_session_id, nozzle_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE pump_meter_readings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shift_session_id UUID NOT NULL REFERENCES shift_sessions(id),
        nozzle_id UUID NOT NULL REFERENCES pump_nozzles(id),
        pumper_id UUID REFERENCES staff_profiles(id),
        reading_type VARCHAR(30) NOT NULL CHECK (reading_type IN ('OPENING', 'CLOSING')),
        meter_reading NUMERIC(14,3) NOT NULL,
        recorded_by UUID REFERENCES portal_users(id),
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, shift_session_id, nozzle_id, reading_type)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE pumper_cash_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shift_session_id UUID NOT NULL REFERENCES shift_sessions(id),
        pumper_id UUID NOT NULL REFERENCES staff_profiles(id),
        expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
        actual_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
        variance NUMERIC(12,2) NOT NULL DEFAULT 0,
        shortfall NUMERIC(12,2) NOT NULL DEFAULT 0,
        excess NUMERIC(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, shift_session_id, pumper_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_pump_nozzle_assignments_tenant_id ON pump_nozzle_assignments(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_pump_meter_readings_tenant_id ON pump_meter_readings(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_pumper_cash_submissions_tenant_id ON pumper_cash_submissions(tenant_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE pumper_cash_submissions`);
    await queryRunner.query(`DROP TABLE pump_meter_readings`);
    await queryRunner.query(`DROP TABLE pump_nozzle_assignments`);
  }
}
