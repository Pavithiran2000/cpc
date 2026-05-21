import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantRegistrationAddressFields1710000000018 implements MigrationInterface {
  name = 'AddTenantRegistrationAddressFields1710000000018';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
        ADD COLUMN address_line1 VARCHAR(150),
        ADD COLUMN address_line2 VARCHAR(150),
        ADD COLUMN city VARCHAR(100),
        ADD COLUMN province VARCHAR(100),
        ADD COLUMN postal_code VARCHAR(30),
        ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT 'Sri Lanka',
        ADD COLUMN latitude NUMERIC(10, 7),
        ADD COLUMN longitude NUMERIC(10, 7),
        ADD COLUMN geo_city_id INT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenants
        DROP COLUMN geo_city_id,
        DROP COLUMN longitude,
        DROP COLUMN latitude,
        DROP COLUMN country,
        DROP COLUMN postal_code,
        DROP COLUMN province,
        DROP COLUMN city,
        DROP COLUMN address_line2,
        DROP COLUMN address_line1
    `);
  }
}
