import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStaffProfilesTable1710000000005 implements MigrationInterface {
  name = 'CreateStaffProfilesTable1710000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE staff_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        employee_no VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(30),
        nic VARCHAR(30),
        address TEXT,
        operational_role_id UUID NOT NULL REFERENCES operational_roles(id),
        basic_salary NUMERIC(12,2) DEFAULT 0,
        shift_rate NUMERIC(12,2) DEFAULT 0,
        ot_rate NUMERIC(12,2) DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        joined_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, employee_no)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_staff_profiles_tenant_id ON staff_profiles(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_staff_profiles_tenant_status ON staff_profiles(tenant_id, status)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE staff_profiles`);
  }
}
