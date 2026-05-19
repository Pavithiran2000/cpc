import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateShiftCorrectionDto } from './dto/shift-correction.dto';
import { ShiftCorrectionsService } from './shift-corrections.service';

@Controller('shift-corrections')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class ShiftCorrectionsController {
  constructor(private readonly corrections: ShiftCorrectionsService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.corrections.list(tenantId);
  }

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateShiftCorrectionDto, @CurrentUser() user: RequestUser) {
    return this.corrections.create(tenantId, dto, user.id);
  }

  @Post(':id/approve')
  approve(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.corrections.approve(tenantId, id, user.id, user.portalRole);
  }

  @Post(':id/apply')
  apply(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.corrections.apply(tenantId, id, user.id, user.portalRole);
  }
}
