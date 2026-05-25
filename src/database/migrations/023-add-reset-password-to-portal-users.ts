import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResetPasswordToPortalUsers1710000000023 implements MigrationInterface {
  name = 'AddResetPasswordToPortalUsers1710000000023';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portal_users
        ADD COLUMN reset_password_token TEXT,
        ADD COLUMN reset_password_expires_at TIMESTAMPTZ
    `);
    await queryRunner.query(`
      CREATE INDEX idx_portal_users_reset_password_token
        ON portal_users (reset_password_token)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portal_users_reset_password_token`);
    await queryRunner.query(`
      ALTER TABLE portal_users
        DROP COLUMN IF EXISTS reset_password_token,
        DROP COLUMN IF EXISTS reset_password_expires_at
    `);
  }
}
