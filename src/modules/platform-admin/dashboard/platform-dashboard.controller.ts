import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { PlatformDashboardService } from './platform-dashboard.service';

@Public()
@UseGuards(PlatformJwtGuard, PlatformRoleGuard)
@Controller('')
export class PlatformDashboardController {
  constructor(private readonly service: PlatformDashboardService) {}

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('tenant-growth')
  getTenantGrowth() {
    return this.service.getTenantGrowth();
  }

  @Get('status-distribution')
  getStatusDistribution() {
    return this.service.getStatusDistribution();
  }

  @Get('recent-activity')
  getRecentActivity(@Query('limit') limit?: string) {
    return this.service.getRecentActivity(limit ? Number(limit) : 10);
  }

  @Get('recent-tenants')
  getRecentTenants(@Query('limit') limit?: string) {
    return this.service.getRecentTenants(limit ? Number(limit) : 5);
  }
}
