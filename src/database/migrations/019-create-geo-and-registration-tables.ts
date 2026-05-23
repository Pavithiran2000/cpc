import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGeoAndRegistrationTables1710000000019 implements MigrationInterface {
  name = 'CreateGeoAndRegistrationTables1710000000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE geo_provinces (
        id INT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE geo_districts (
        id INT PRIMARY KEY,
        province_id INT NOT NULL REFERENCES geo_provinces(id),
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (province_id, name)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_geo_districts_province_id ON geo_districts(province_id)`);

    await queryRunner.query(`
      CREATE TABLE geo_cities (
        id INT PRIMARY KEY,
        district_id INT NOT NULL REFERENCES geo_districts(id),
        province_id INT NOT NULL REFERENCES geo_provinces(id),
        name VARCHAR(100) NOT NULL,
        sub_name VARCHAR(100),
        postal_code VARCHAR(30),
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_geo_cities_district_name ON geo_cities(district_id, name)`);
    await queryRunner.query(`CREATE INDEX idx_geo_cities_province_id ON geo_cities(province_id)`);
    await queryRunner.query(`CREATE INDEX idx_geo_cities_name ON geo_cities(name)`);

    await queryRunner.query(`
      CREATE TABLE geo_custom_cities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        district_id INT NOT NULL REFERENCES geo_districts(id),
        province_id INT NOT NULL REFERENCES geo_provinces(id),
        name VARCHAR(100) NOT NULL,
        normalized_name VARCHAR(100) NOT NULL,
        postal_code VARCHAR(30),
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        created_by_tenant_id UUID REFERENCES tenants(id),
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (district_id, normalized_name)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_geo_custom_cities_province_id ON geo_custom_cities(province_id)`);
    await queryRunner.query(`CREATE INDEX idx_geo_custom_cities_status ON geo_custom_cities(status)`);

    await queryRunner.query(`
      CREATE TABLE tenant_registration_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_code VARCHAR(50) NOT NULL,
        station_name VARCHAR(150) NOT NULL,
        owner_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        country VARCHAR(100) NOT NULL DEFAULT 'Sri Lanka',
        address_line1 VARCHAR(150) NOT NULL,
        address_line2 VARCHAR(150),
        province_id INT NOT NULL REFERENCES geo_provinces(id),
        district_id INT NOT NULL REFERENCES geo_districts(id),
        geo_city_id INT REFERENCES geo_cities(id),
        custom_city_name VARCHAR(100),
        postal_code VARCHAR(30),
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        owner_email VARCHAR(150) NOT NULL,
        owner_password_hash TEXT NOT NULL,
        verification_code_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempt_count INT NOT NULL DEFAULT 0,
        last_sent_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (
          (geo_city_id IS NOT NULL AND custom_city_name IS NULL) OR
          (geo_city_id IS NULL AND custom_city_name IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_tenant_registration_station_code ON tenant_registration_attempts(station_code)`);
    await queryRunner.query(`CREATE INDEX idx_tenant_registration_owner_email ON tenant_registration_attempts(owner_email)`);
    await queryRunner.query(`CREATE INDEX idx_tenant_registration_status ON tenant_registration_attempts(status)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE tenant_registration_attempts`);
    await queryRunner.query(`DROP TABLE geo_custom_cities`);
    await queryRunner.query(`DROP TABLE geo_cities`);
    await queryRunner.query(`DROP TABLE geo_districts`);
    await queryRunner.query(`DROP TABLE geo_provinces`);
  }
}
