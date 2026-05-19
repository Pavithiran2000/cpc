import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1710000000008 implements MigrationInterface {
  name = 'CreateProductsTable1710000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE measurement_units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(30) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        decimal_precision INT NOT NULL DEFAULT 2
      )
    `);
    await queryRunner.query(`
      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        product_code VARCHAR(50) NOT NULL,
        product_name VARCHAR(150) NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('FUEL', 'GAS', 'LUBRICANT')),
        measurement_unit_id UUID NOT NULL REFERENCES measurement_units(id),
        is_fuel BOOLEAN NOT NULL DEFAULT false,
        is_lubricant BOOLEAN NOT NULL DEFAULT false,
        is_gas BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, product_code)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE product_prices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        product_id UUID NOT NULL REFERENCES products(id),
        selling_price NUMERIC(12,2) NOT NULL,
        cost_price NUMERIC(12,2) DEFAULT 0,
        effective_from TIMESTAMPTZ NOT NULL,
        effective_to TIMESTAMPTZ,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_by UUID REFERENCES portal_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_products_tenant_id ON products(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_products_tenant_status ON products(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_product_prices_tenant_id ON product_prices(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_product_prices_tenant_product ON product_prices(tenant_id, product_id, effective_from)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE product_prices`);
    await queryRunner.query(`DROP TABLE products`);
    await queryRunner.query(`DROP TABLE measurement_units`);
  }
}
