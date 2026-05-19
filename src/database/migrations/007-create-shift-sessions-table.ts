import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShiftSessionsTable1710000000007 implements MigrationInterface {
  name = 'CreateShiftSessionsTable1710000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shift_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shift_template_id UUID NOT NULL REFERENCES shift_templates(id),
        business_date DATE NOT NULL,
        manager_id UUID REFERENCES staff_profiles(id),
        opened_by UUID REFERENCES portal_users(id),
        closed_by UUID REFERENCES portal_users(id),
        opened_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE staff_shift_attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shift_session_id UUID NOT NULL REFERENCES shift_sessions(id),
        staff_id UUID NOT NULL REFERENCES staff_profiles(id),
        clock_in_at TIMESTAMPTZ,
        clock_out_at TIMESTAMPTZ,
        attendance_status VARCHAR(30) NOT NULL DEFAULT 'PRESENT',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, shift_session_id, staff_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_shift_sessions_tenant_id ON shift_sessions(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_shift_sessions_tenant_date ON shift_sessions(tenant_id, business_date)`);
    await queryRunner.query(`CREATE INDEX idx_shift_sessions_tenant_status ON shift_sessions(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_staff_shift_attendance_tenant_id ON staff_shift_attendance(tenant_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE staff_shift_attendance`);
    await queryRunner.query(`DROP TABLE shift_sessions`);
  }
}
