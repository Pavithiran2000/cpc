import { MigrationInterface, QueryRunner } from 'typeorm';

export class Add2faToPortalUsers1710000000022 implements MigrationInterface {
  name = 'Add2faToPortalUsers1710000000022';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portal_users
        ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN two_factor_secret TEXT,
        ADD COLUMN two_factor_pending_secret TEXT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portal_users
        DROP COLUMN two_factor_enabled,
        DROP COLUMN two_factor_secret,
        DROP COLUMN two_factor_pending_secret
    `);
  }
}
