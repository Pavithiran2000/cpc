import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantSettingsTable1710000000002 implements MigrationInterface {
  name = 'CreateTenantSettingsTable1710000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tenant_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, setting_key)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_tenant_settings_tenant_id ON tenant_settings(tenant_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE tenant_settings`);
  }
}
