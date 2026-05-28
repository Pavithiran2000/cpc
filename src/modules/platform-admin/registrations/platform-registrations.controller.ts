import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentPlatformAdmin, PlatformAdminUser } from '../auth/decorators/current-platform-admin.decorator';
import { PlatformRoles } from '../auth/decorators/platform-roles.decorator';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformRole } from '../../../database/entities';
import { PlatformRegistrationsService } from './platform-registrations.service';
import { PlatformRejectRegistrationDto } from './dto/platform-reject-registration.dto';

@Public()
@UseGuards(PlatformJwtGuard, PlatformRoleGuard)
@Controller('')
export class PlatformRegistrationsController {
  constructor(private readonly service: PlatformRegistrationsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sort_by') sort_by?: string,
    @Query('sort_order') sort_order?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
      sort_by,
      sort_order,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id') id: string,
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
  ) {
    return this.service.approve(id, { id: admin.id, email: admin.email });
  }

  @PlatformRoles(PlatformRole.SuperAdmin, PlatformRole.Admin)
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id') id: string,
    @Body() dto: PlatformRejectRegistrationDto,
    @CurrentPlatformAdmin() admin: PlatformAdminUser,
  ) {
    return this.service.reject(id, { id: admin.id, email: admin.email }, dto.reason);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  resend(@Param('id') id: string) {
    return this.service.resend(id);
  }
}
