import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsUpdatedBy1710000000016 implements MigrationInterface {
  name = 'AddProductsUpdatedBy1710000000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES portal_users(id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN IF EXISTS updated_by`);
  }
}
