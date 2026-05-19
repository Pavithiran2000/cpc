import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePumpsAndNozzlesTable1710000000009 implements MigrationInterface {
  name = 'CreatePumpsAndNozzlesTable1710000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pumps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        pump_code VARCHAR(50) NOT NULL,
        pump_name VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, pump_code)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE pump_nozzles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        pump_id UUID NOT NULL REFERENCES pumps(id),
        product_id UUID NOT NULL REFERENCES products(id),
        nozzle_name VARCHAR(100) NOT NULL,
        nozzle_code VARCHAR(50) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, pump_id, nozzle_code)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_pumps_tenant_id ON pumps(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_pump_nozzles_tenant_id ON pump_nozzles(tenant_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE pump_nozzles`);
    await queryRunner.query(`DROP TABLE pumps`);
  }
}
