import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { DailyBalancingService } from './daily-balancing.service';
import { CreateDailyBalanceDto } from './dto/daily-balancing.dto';

@Controller('daily-balancing')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class DailyBalancingController {
  constructor(private readonly balancing: DailyBalancingService) {}

  @Post()
  upsert(@CurrentTenant() tenantId: string, @Body() dto: CreateDailyBalanceDto, @CurrentUser() user: RequestUser) {
    return this.balancing.upsert(tenantId, dto, user.id);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.balancing.list(tenantId, query);
  }

  @Post(':id/close')
  close(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.balancing.close(tenantId, id, user.id);
  }
}
