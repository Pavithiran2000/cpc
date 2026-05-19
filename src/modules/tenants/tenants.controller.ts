import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { SkipTenant } from '../../common/decorators/skip-tenant.decorator';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantSettingsDto } from './dto/update-settings.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@Roles(PortalRole.Admin)
@SkipTenant()
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: RequestUser) {
    return this.tenants.create(dto, user.id);
  }

  @Get()
  findAll(@Query() query: ListQueryDto) {
    return this.tenants.findAll(query);
  }

  @Get('current')
  @Roles(PortalRole.Admin, PortalRole.Owner)
  findCurrent(@CurrentUser() user: RequestUser) {
    return this.tenants.findOne(user.tenantId);
  }

  @Get('current/settings')
  @Roles(PortalRole.Admin, PortalRole.Owner)
  getCurrentSettings(@CurrentUser() user: RequestUser) {
    return this.tenants.getSettings(user.tenantId);
  }

  @Patch('current/settings')
  @Roles(PortalRole.Admin, PortalRole.Owner)
  updateCurrentSettings(@Body() dto: UpdateTenantSettingsDto, @CurrentUser() user: RequestUser) {
    return this.tenants.updateSettings(user.tenantId, dto.settings, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenants.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto, @CurrentUser() user: RequestUser) {
    return this.tenants.update(id, dto, user.id);
  }

  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() dto: UpdateTenantSettingsDto, @CurrentUser() user: RequestUser) {
    return this.tenants.updateSettings(id, dto.settings, user.id);
  }
}
