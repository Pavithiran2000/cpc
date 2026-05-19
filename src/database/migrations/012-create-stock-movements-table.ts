import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStockMovementsTable1710000000012 implements MigrationInterface {
  name = 'CreateStockMovementsTable1710000000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        product_id UUID NOT NULL REFERENCES products(id),
        movement_type VARCHAR(50) NOT NULL,
        reference_type VARCHAR(50),
        reference_id UUID,
        quantity_in NUMERIC(14,3) NOT NULL DEFAULT 0,
        quantity_out NUMERIC(14,3) NOT NULL DEFAULT 0,
        balance_after NUMERIC(14,3) NOT NULL,
        created_by UUID REFERENCES portal_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_stock_movements_tenant_id ON stock_movements(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_stock_movements_tenant_date ON stock_movements(tenant_id, created_at)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE stock_movements`);
  }
}
