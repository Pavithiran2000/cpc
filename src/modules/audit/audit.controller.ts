import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { EntityChangeLog } from '../../database/entities';

@Controller('audit')
@Roles(PortalRole.Admin)
export class AuditController {
  constructor(
    @InjectRepository(EntityChangeLog)
    private readonly changeLogs: Repository<EntityChangeLog>,
  ) {}

  @Get('entity-change-logs')
  list(
    @CurrentTenant() tenantId: string,
    @Query('entity_type') entityType?: string,
    @Query('entity_id') entityId?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    const qb = this.changeLogs
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .orderBy('log.createdAt', 'DESC')
      .take(+limit)
      .skip(+offset);

    if (entityType) qb.andWhere('log.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('log.entityId = :entityId', { entityId });

    return qb.getManyAndCount().then(([data, total]) => ({ data, total }));
  }
}
