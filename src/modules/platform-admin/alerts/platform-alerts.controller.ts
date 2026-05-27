import { Controller, Get, Patch, Query, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformAlertsService } from './platform-alerts.service';

@Public()
@UseGuards(PlatformJwtGuard, PlatformRoleGuard)
@Controller('')
export class PlatformAlertsController {
  constructor(private readonly service: PlatformAlertsService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('severity') severity?: string,
    @Query('acknowledged') acknowledged?: string,
  ) {
    return this.service.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      severity,
      acknowledged,
    });
  }

  @Patch(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Req() req: Request) {
    const admin = (req as any).user;
    return this.service.acknowledge(id, admin.sub);
  }

  @Patch('acknowledge-all')
  acknowledgeAll(@Req() req: Request) {
    const admin = (req as any).user;
    return this.service.acknowledgeAll(admin.sub);
  }
}
