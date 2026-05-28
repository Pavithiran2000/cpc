import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { PlatformJwtGuard } from '../auth/guards/platform-jwt.guard';
import { PlatformRoleGuard } from '../auth/guards/platform-role.guard';
import { SystemHealthService } from './system-health.service';

@Public()
@UseGuards(PlatformJwtGuard, PlatformRoleGuard)
@Controller('')
export class SystemHealthController {
  constructor(private readonly service: SystemHealthService) {}

  @Get()
  getHealth() {
    return this.service.getHealth();
  }
}
