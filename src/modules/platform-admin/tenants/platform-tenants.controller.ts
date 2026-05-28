import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentPlatformAdmin, PlatformAdminUser } from '../auth/decorators/current-platform-admin.decorator';
import { PlatformRoles } from '../auth/decorators/platform-roles.decorator';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformRole } from '../../../database/entities';
import { PlatformCreateTenantDto } from './dto/platform-create-tenant.dto';
import { PlatformUpdateTenantDto } from './dto/platform-update-tenant.dto';
import { PlatformTenantStatusDto } from './dto/platform-tenant-status.dto';
import { PlatformTenantSettingsDto } from './dto/platform-tenant-settings.dto';
import { PlatformTenantsService } from './platform-tenants.service';

@Public()
@UseGuards(PlatformJwtGuard, PlatformRoleGuard)
@Controller('')
export class PlatformTenantsController {
  constructor(private readonly service: PlatformTenantsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('district') district?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
      district,
      sort_by,
      sort_order,
    });
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Post()
  create(
    @Body() dto: PlatformCreateTenantDto,
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
  ) {
    return this.service.create(dto, admin.id, admin.email);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: PlatformUpdateTenantDto,
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
  ) {
    return this.service.update(id, dto, admin.id, admin.email);
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: PlatformTenantStatusDto,
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
  ) {
    return this.service.changeStatus(id, dto.status, admin.id, admin.email, dto.reason);
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Patch(':id/settings')
  updateSettings(
    @Param('id') id: string,
    @Body() dto: PlatformTenantSettingsDto,
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
  ) {
    return this.service.updateSettings(id, dto.settings, admin.id, admin.email);
  }

  @Get(':id/stats')
  getTenantStats(@Param('id') id: string) {
    return this.service.getTenantStats(id);
  }

  @Get(':id/users')
  getTenantUsers(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getTenantUsers(id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Post(':id/reset-sessions')
  @HttpCode(HttpStatus.OK)
  resetTenantSessions(@Param('id') id: string, @CurrentPlatformAdmin() admin: PlatformAdminUser) {
    return this.service.resetTenantSessions(id, admin.id, admin.email);
  }

  @Get(':id/activity')
  getTenantActivity(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getTenantActivity(id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
