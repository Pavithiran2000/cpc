import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockBalancesTable1710000000011 implements MigrationInterface {
  name = 'CreateStockBalancesTable1710000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE stock_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        product_id UUID NOT NULL REFERENCES products(id),
        quantity_on_hand NUMERIC(14,3) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, product_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE fuel_tanks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        tank_code VARCHAR(50) NOT NULL,
        fuel_product_id UUID NOT NULL REFERENCES products(id),
        capacity_litres NUMERIC(14,3) NOT NULL,
        current_stock_litres NUMERIC(14,3) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, tank_code)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_stock_balances_tenant_id ON stock_balances(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_fuel_tanks_tenant_id ON fuel_tanks(tenant_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE fuel_tanks`);
    await queryRunner.query(`DROP TABLE stock_balances`);
  }
}
