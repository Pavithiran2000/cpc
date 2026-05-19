import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { AttendanceService } from './attendance.service';
import { ClockInDto, ClockOutDto } from './dto/attendance.dto';

@Controller('attendance')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('clock-in')
  clockIn(@CurrentTenant() tenantId: string, @Body() dto: ClockInDto, @CurrentUser() user: RequestUser) {
    return this.attendance.clockIn(tenantId, dto, user.id);
  }

  @Post('clock-out')
  clockOut(@CurrentTenant() tenantId: string, @Body() dto: ClockOutDto, @CurrentUser() user: RequestUser) {
    return this.attendance.clockOut(tenantId, dto, user.id);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto & { shift_session_id?: string }) {
    return this.attendance.list(tenantId, query);
  }
}
