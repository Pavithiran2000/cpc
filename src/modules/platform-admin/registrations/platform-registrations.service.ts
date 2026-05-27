import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PlatformActivityLog, PlatformRegistration } from '../../../database/entities';
import { paginated, safeSortBy } from '../../../common/dto';

@Injectable()
export class PlatformRegistrationsService {
  constructor(
    @InjectRepository(PlatformRegistration)
    private readonly registrations: Repository<PlatformRegistration>,
    @InjectRepository(PlatformActivityLog)
    private readonly activityLogs: Repository<PlatformActivityLog>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const orderBy = safeSortBy(
      query.sort_by,
      {
        station_name: 'r.stationName',
        station_code: 'r.stationCode',
        created_at: 'r.createdAt',
        status: 'r.status',
      },
      'r.createdAt',
    );
    const direction = (query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    const qb = this.registrations.createQueryBuilder('r');

    if (query.status && query.status !== 'ALL') {
      qb.andWhere('r.status = :status', { status: query.status });
    }
    if (query.search?.trim()) {
      const s = `%${query.search.trim().replace(/[%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(r.stationName ILIKE :s OR r.stationCode ILIKE :s OR r.name ILIKE :s OR r.email ILIKE :s)',
        { s },
      );
    }

    qb.orderBy(orderBy, direction).take(limit).skip((page - 1) * limit);
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, { page, limit });
  }

  async findOne(id: string): Promise<PlatformRegistration> {
    const reg = await this.registrations.findOne({ where: { id } });
    if (!reg) throw new NotFoundException('Registration not found');
    return reg;
  }

  async approve(id: string, admin: { id: string; email: string }): Promise<PlatformRegistration> {
    const reg = await this.findOne(id);
    if (reg.status !== 'PENDING') {
      throw new BadRequestException(`Registration is already ${reg.status.toLowerCase()}`);
    }
    reg.status = 'APPROVED';
    reg.reviewedAt = new Date();
    reg.reviewedByEmail = admin.email;
    const saved = await this.registrations.save(reg);

    await this.activityLogs.save(
      this.activityLogs.create({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REGISTRATION_APPROVED',
        targetType: 'REGISTRATION',
        targetId: id,
        targetLabel: reg.stationCode,
      }),
    );

    return saved;
  }

  async reject(
    id: string,
    admin: { id: string; email: string },
    reason?: string,
  ): Promise<PlatformRegistration> {
    const reg = await this.findOne(id);
    if (reg.status !== 'PENDING') {
      throw new BadRequestException(`Registration is already ${reg.status.toLowerCase()}`);
    }
    reg.status = 'REJECTED';
    reg.reviewedAt = new Date();
    reg.reviewedByEmail = admin.email;
    if (reason?.trim()) reg.rejectionReason = reason.trim();
    const saved = await this.registrations.save(reg);

    await this.activityLogs.save(
      this.activityLogs.create({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REGISTRATION_REJECTED',
        targetType: 'REGISTRATION',
        targetId: id,
        targetLabel: reg.stationCode,
        details: reason ? { reason } : undefined,
      }),
    );

    return saved;
  }

  async resend(id: string): Promise<{ ok: boolean }> {
    await this.findOne(id);
    return { ok: true };
  }
}
