import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreatePumpDto, CreateStandaloneNozzleDto, UpdatePumpDto } from './dto/create-pump.dto';
import { PumpsService } from './pumps.service';

@Controller()
@Roles(PortalRole.Admin, PortalRole.Owner)
export class PumpsController {
  constructor(private readonly pumps: PumpsService) {}

  @Post('pumps')
  create(@CurrentTenant() tenantId: string, @Body() dto: CreatePumpDto, @CurrentUser() user: RequestUser) {
    return this.pumps.create(tenantId, dto, user.id);
  }

  @Get('pumps')
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.pumps.list(tenantId, query);
  }

  @Patch('pumps/:id')
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdatePumpDto, @CurrentUser() user: RequestUser) {
    return this.pumps.update(tenantId, id, dto, user.id);
  }

  @Post('pump-nozzles')
  createNozzle(@CurrentTenant() tenantId: string, @Body() dto: CreateStandaloneNozzleDto, @CurrentUser() user: RequestUser) {
    return this.pumps.createNozzle(tenantId, dto, user.id);
  }

  @Get('pump-nozzles')
  listNozzles(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.pumps.listNozzles(tenantId, query);
  }

  @Patch('pump-nozzles/:id')
  updateNozzle(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: Partial<CreateStandaloneNozzleDto>, @CurrentUser() user: RequestUser) {
    return this.pumps.updateNozzle(tenantId, id, dto, user.id);
  }
}
