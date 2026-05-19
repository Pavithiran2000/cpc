import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantsTable1710000000001 implements MigrationInterface {
  name = 'CreateTenantsTable1710000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_code VARCHAR(50) NOT NULL UNIQUE,
        station_name VARCHAR(150) NOT NULL,
        owner_name VARCHAR(150),
        address TEXT,
        district VARCHAR(100),
        contact_number VARCHAR(30),
        email VARCHAR(150),
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE tenants`);
  }
}
