import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOperationalRolesTable1710000000004 implements MigrationInterface {
  name = 'CreateOperationalRolesTable1710000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE operational_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        name VARCHAR(100) NOT NULL,
        requires_attendance BOOLEAN NOT NULL DEFAULT false,
        liable_for_cash_shortfall BOOLEAN NOT NULL DEFAULT false,
        description TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, name)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_operational_roles_tenant_id ON operational_roles(tenant_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE operational_roles`);
  }
}
