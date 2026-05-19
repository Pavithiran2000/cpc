import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePortalUsersTable1710000000003 implements MigrationInterface {
  name = 'CreatePortalUsersTable1710000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE portal_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone VARCHAR(30),
        password_hash TEXT NOT NULL,
        portal_role VARCHAR(30) NOT NULL CHECK (portal_role IN ('ADMIN', 'OWNER')),
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, email)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portal_users_tenant_id ON portal_users(tenant_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE portal_users`);
  }
}
