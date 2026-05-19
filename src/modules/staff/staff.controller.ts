import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@Controller('staff')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateStaffDto, @CurrentUser() user: RequestUser) {
    return this.staff.create(tenantId, dto, user.id);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.staff.list(tenantId, query);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.staff.findOne(tenantId, id);
  }

  @Patch(':id')
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateStaffDto, @CurrentUser() user: RequestUser) {
    return this.staff.update(tenantId, id, dto, user.id);
  }

  @Delete(':id')
  deactivate(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.staff.deactivate(tenantId, id, user.id);
  }
}
