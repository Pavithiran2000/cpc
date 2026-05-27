import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformAlerts1710000000025 implements MigrationInterface {
  name = 'CreatePlatformAlerts1710000000025';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE platform_alerts (
        id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type                     VARCHAR(100) NOT NULL,
        severity                 VARCHAR(20)  NOT NULL DEFAULT 'INFO'
                                   CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
        message                  VARCHAR(255) NOT NULL,
        related_entity_type      VARCHAR(100),
        related_entity_id        VARCHAR(36),
        related_entity_label     VARCHAR(255),
        acknowledged             BOOLEAN      NOT NULL DEFAULT FALSE,
        acknowledged_by_admin_id UUID         REFERENCES platform_admins(id) ON DELETE SET NULL,
        acknowledged_at          TIMESTAMPTZ,
        metadata                 JSONB,
        created_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_platform_alerts_severity     ON platform_alerts(severity)`);
    await queryRunner.query(`CREATE INDEX idx_platform_alerts_acknowledged ON platform_alerts(acknowledged)`);
    await queryRunner.query(`CREATE INDEX idx_platform_alerts_created_at   ON platform_alerts(created_at DESC)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS platform_alerts`);
  }
}
