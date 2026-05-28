import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformAdminTables1710000000025 implements MigrationInterface {
  name = 'CreatePlatformAdminTables1710000000025';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE platform_admins (
        id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email                     VARCHAR(150) NOT NULL UNIQUE,
        password_hash             TEXT NOT NULL,
        name                      VARCHAR(150) NOT NULL,
        platform_role             VARCHAR(30) NOT NULL DEFAULT 'ADMIN'
                                    CHECK (platform_role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT')),
        status                    VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
                                    CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
        two_factor_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
        two_factor_secret         TEXT,
        two_factor_pending_secret TEXT,
        mfa_method                VARCHAR(20)
                                    CHECK (mfa_method IN ('TOTP', 'EMAIL', 'BOTH')),
        email_otp_code_hash       TEXT,
        email_otp_expires_at      TIMESTAMPTZ,
        backup_codes              JSONB,
        reset_password_token      TEXT,
        reset_password_expires_at TIMESTAMPTZ,
        last_login_at             TIMESTAMPTZ,
        last_login_ip             VARCHAR(100),
        failed_login_attempts     INT NOT NULL DEFAULT 0,
        locked_until              TIMESTAMPTZ,
        invited_by                UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
        invite_token_hash         TEXT,
        invite_expires_at         TIMESTAMPTZ,
        created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_platform_admins_email  ON platform_admins(email);
      CREATE INDEX idx_platform_admins_status ON platform_admins(status)
    `);

    await queryRunner.query(`
      CREATE TABLE platform_admin_refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id    UUID NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
        token_hash  TEXT NOT NULL,
        family_id   UUID NOT NULL,
        ip_address  VARCHAR(100),
        user_agent  TEXT,
        expires_at  TIMESTAMPTZ NOT NULL,
        revoked_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_platform_refresh_admin_id    ON platform_admin_refresh_tokens(admin_id);
      CREATE INDEX idx_platform_refresh_token_hash  ON platform_admin_refresh_tokens(token_hash)
    `);

    await queryRunner.query(`
      CREATE TABLE platform_activity_logs (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id     UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
        admin_email  VARCHAR(150),
        action       VARCHAR(100) NOT NULL,
        target_type  VARCHAR(100),
        target_id    VARCHAR(36),
        target_label VARCHAR(255),
        details      JSONB,
        ip_address   VARCHAR(100),
        user_agent   TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_platform_activity_admin_id    ON platform_activity_logs(admin_id);
      CREATE INDEX idx_platform_activity_created_at  ON platform_activity_logs(created_at DESC);
      CREATE INDEX idx_platform_activity_action      ON platform_activity_logs(action);
      CREATE INDEX idx_platform_activity_target      ON platform_activity_logs(target_type, target_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS platform_activity_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS platform_admin_refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS platform_admins`);
  }
}
