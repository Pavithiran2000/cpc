import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShiftTemplatesTable1710000000006 implements MigrationInterface {
  name = 'CreateShiftTemplatesTable1710000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE shift_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shift_name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_night_shift BOOLEAN NOT NULL DEFAULT false,
        sequence_no INT NOT NULL DEFAULT 1,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, shift_name)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_shift_templates_tenant_id ON shift_templates(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_shift_templates_tenant_status ON shift_templates(tenant_id, status)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE shift_templates`);
  }
}
