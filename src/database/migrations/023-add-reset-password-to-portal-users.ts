import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResetPasswordToPortalUsers1710000000023 implements MigrationInterface {
  name = 'AddResetPasswordToPortalUsers1710000000023';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portal_users
        ADD COLUMN reset_password_token TEXT,
        ADD COLUMN reset_password_expires_at TIMESTAMPTZ
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portal_users
        DROP COLUMN reset_password_token,
        DROP COLUMN reset_password_expires_at
    `);
  }
}
