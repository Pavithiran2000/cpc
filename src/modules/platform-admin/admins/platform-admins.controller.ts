import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentPlatformAdmin, PlatformAdminUser } from '../auth/decorators/current-platform-admin.decorator';
import { PlatformRoles } from '../auth/decorators/platform-roles.decorator';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformRole } from '../../../database/entities';
import { PlatformInviteAdminDto } from './dto/platform-invite-admin.dto';
import { PlatformUpdateAdminDto } from './dto/platform-update-admin.dto';
import { PlatformChangeRoleDto } from './dto/platform-change-role.dto';
import { PlatformChangeAdminStatusDto } from './dto/platform-change-admin-status.dto';
import { PlatformAdminsService } from './platform-admins.service';

@Public()
@UseGuards(PlatformJwtGuard, PlatformRoleGuard)
@Controller('')
export class PlatformAdminsController {
  constructor(private readonly service: PlatformAdminsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('platform_role') platform_role?: string,
    @Query('status') status?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      platform_role,
      status,
      sort_by,
      sort_order,
    });
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  invite(@Body() dto: PlatformInviteAdminDto, @CurrentPlatformAdmin() admin: PlatformAdminUser) {
    return this.service.invite(dto, { id: admin.id, email: admin.email });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: PlatformUpdateAdminDto,
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
  ) {
    return this.service.update(id, dto, { id: admin.id, email: admin.email });
  }

  @PlatformRoles(PlatformRole.SuperAdmin)
  @Patch(':id/role')
  changeRole(
    @Param('id') id: string,
    @Body() dto: PlatformChangeRoleDto,
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
  ) {
    return this.service.changeRole(id, dto, {
      id: admin.id,
      email: admin.email,
      platformRole: admin.platformRole,
    });
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: PlatformChangeAdminStatusDto,
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
  ) {
    return this.service.changeStatus(id, dto, { id: admin.id, email: admin.email });
  }

  @PlatformRoles(PlatformRole.SuperAdmin)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentPlatformAdmin() admin: PlatformAdminUser) {
    return this.service.remove(id, {
      id: admin.id,
      email: admin.email,
      platformRole: admin.platformRole,
    });
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Param('id') id: string, @CurrentPlatformAdmin() admin: PlatformAdminUser) {
    return this.service.resetAdminPassword(id, { id: admin.id, email: admin.email });
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Delete(':id/sessions')
  revokeAllSessions(@Param('id') id: string, @CurrentPlatformAdmin() admin: PlatformAdminUser) {
    return this.service.revokeAllSessions(id, { id: admin.id, email: admin.email });
  }
}
