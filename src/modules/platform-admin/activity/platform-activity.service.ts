import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformActivityLog } from '../../../database/entities';
import { paginated, safeSortBy } from '../../../common/dto';

@Injectable()
export class PlatformActivityService {
  constructor(
    @InjectRepository(PlatformActivityLog) private readonly activityLogs: Repository<PlatformActivityLog>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    admin_id?: string;
    action?: string;
    target_type?: string;
    date_from?: string;
    date_to?: string;
    sort_order?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);

    const qb = this.activityLogs
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin');

    if (query.admin_id) qb.andWhere('log.adminId = :adminId', { adminId: query.admin_id });
    if (query.action) qb.andWhere('log.action = :action', { action: query.action });
    if (query.target_type) qb.andWhere('log.targetType = :targetType', { targetType: query.target_type });
    if (query.date_from) qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: query.date_from });
    if (query.date_to) {
      qb.andWhere("log.createdAt < (CAST(:dateTo AS date) + interval '1 day')", { dateTo: query.date_to });
    }

    const direction = (query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    qb.orderBy('log.createdAt', direction).take(limit).skip((page - 1) * limit);

    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, { page, limit });
  }
}
