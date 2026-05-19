import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreatePortalUserDto } from './dto/create-portal-user.dto';
import { UpdatePortalUserDto } from './dto/update-portal-user.dto';
import { PortalUsersService } from './portal-users.service';

@Controller('portal-users')
@Roles(PortalRole.Admin)
export class PortalUsersController {
  constructor(private readonly users: PortalUsersService) {}

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.users.list(tenantId, query);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreatePortalUserDto, @CurrentUser() user: RequestUser) {
    return this.users.create(tenantId, dto, user.id);
  }

  @Patch(':id')
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdatePortalUserDto, @CurrentUser() user: RequestUser) {
    return this.users.update(tenantId, id, dto, user.id);
  }
}
