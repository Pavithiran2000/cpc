import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformActivityService } from './platform-activity.service';

@Public()
@UseGuards(PlatformJwtGuard, PlatformRoleGuard)
@Controller('')
export class PlatformActivityController {
  constructor(private readonly service: PlatformActivityService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('admin_id') admin_id?: string,
    @Query('action') action?: string,
    @Query('target_type') target_type?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('sort_order') sort_order?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      admin_id,
      action,
      target_type,
      date_from,
      date_to,
      sort_order,
    });
  }
}
