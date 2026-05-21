import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenFamily1710000000017 implements MigrationInterface {
  name = 'AddRefreshTokenFamily1710000000017';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE portal_user_refresh_tokens ADD COLUMN IF NOT EXISTS family_id UUID`);
    await queryRunner.query(`UPDATE portal_user_refresh_tokens SET family_id = id WHERE family_id IS NULL`);
    await queryRunner.query(`ALTER TABLE portal_user_refresh_tokens ALTER COLUMN family_id SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_portal_user_refresh_tokens_hash ON portal_user_refresh_tokens(token_hash)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_portal_user_refresh_tokens_family ON portal_user_refresh_tokens(family_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portal_user_refresh_tokens_family`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portal_user_refresh_tokens_hash`);
    await queryRunner.query(`ALTER TABLE portal_user_refresh_tokens DROP COLUMN IF EXISTS family_id`);
  }
}
