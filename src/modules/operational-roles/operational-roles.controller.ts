import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateOperationalRoleDto } from './dto/create-operational-role.dto';
import { UpdateOperationalRoleDto } from './dto/update-operational-role.dto';
import { OperationalRolesService } from './operational-roles.service';

@Controller('operational-roles')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class OperationalRolesController {
  constructor(private readonly roles: OperationalRolesService) {}

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.roles.list(tenantId, query);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateOperationalRoleDto, @CurrentUser() user: RequestUser) {
    return this.roles.create(tenantId, dto, user.id);
  }

  @Patch(':id')
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateOperationalRoleDto, @CurrentUser() user: RequestUser) {
    return this.roles.update(tenantId, id, dto, user.id);
  }
}
