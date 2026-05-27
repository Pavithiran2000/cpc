import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformAlert, AlertSeverity } from '../../../database/entities';

@Injectable()
export class PlatformAlertsService {
  constructor(
    @InjectRepository(PlatformAlert) private readonly alerts: Repository<PlatformAlert>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    severity?: string;
    acknowledged?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);

    const qb = this.alerts.createQueryBuilder('alert')
      .leftJoinAndSelect('alert.acknowledgedBy', 'acknowledgedBy')
      .orderBy('alert.createdAt', 'DESC');

    if (query.severity) {
      qb.andWhere('alert.severity = :severity', { severity: query.severity });
    }
    if (query.acknowledged === 'true') {
      qb.andWhere('alert.acknowledged = true');
    } else if (query.acknowledged === 'false') {
      qb.andWhere('alert.acknowledged = false');
    }

    qb.take(limit).skip((page - 1) * limit);
    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((a) => this.toDto(a)),
      meta: { page, limit, total },
    };
  }

  async acknowledge(id: string, adminId: string) {
    await this.alerts.update(id, {
      acknowledged: true,
      acknowledgedByAdminId: adminId,
      acknowledgedAt: new Date(),
    });
    return this.alerts.findOne({ where: { id }, relations: ['acknowledgedBy'] }).then((a) => this.toDto(a!));
  }

  async acknowledgeAll(adminId: string) {
    await this.alerts
      .createQueryBuilder()
      .update()
      .set({ acknowledged: true, acknowledgedByAdminId: adminId, acknowledgedAt: new Date() })
      .where('acknowledged = false')
      .execute();
    return { ok: true };
  }

  async create(data: {
    type: string;
    severity: AlertSeverity;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    relatedEntityLabel?: string;
    metadata?: Record<string, unknown>;
  }) {
    const alert = this.alerts.create({
      ...data,
      acknowledged: false,
    });
    return this.alerts.save(alert);
  }

  private toDto(alert: PlatformAlert) {
    return {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      relatedEntityType: alert.relatedEntityType,
      relatedEntityId: alert.relatedEntityId,
      relatedEntityLabel: alert.relatedEntityLabel,
      acknowledged: alert.acknowledged,
      acknowledgedAt: alert.acknowledgedAt,
      acknowledgedByEmail: alert.acknowledgedBy?.email ?? null,
      metadata: alert.metadata,
      createdAt: alert.createdAt,
    };
  }
}
