import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformRegistrations1710000000024 implements MigrationInterface {
  name = 'CreatePlatformRegistrations1710000000024';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE platform_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_code VARCHAR(50) NOT NULL,
        station_name VARCHAR(150) NOT NULL,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        district VARCHAR(100),
        contact_number VARCHAR(50),
        address TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        reviewed_at TIMESTAMPTZ,
        reviewed_by_email VARCHAR(150),
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_platform_registrations_status ON platform_registrations(status)`);
    await queryRunner.query(`CREATE INDEX idx_platform_registrations_station_code ON platform_registrations(station_code)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS platform_registrations`);
  }
}
