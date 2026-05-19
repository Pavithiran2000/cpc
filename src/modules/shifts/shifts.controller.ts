import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { AssignNozzlesDto, CashSubmissionsDto, CloseShiftDto, ReadingsDto } from './dto/shift-flow.dto';
import { CreateShiftSessionDto, CreateShiftTemplateDto, UpdateShiftTemplateDto } from './dto/shift-template.dto';
import { ShiftsService } from './shifts.service';

@Controller()
@Roles(PortalRole.Admin, PortalRole.Owner)
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Post('shift-templates')
  createTemplate(@CurrentTenant() tenantId: string, @Body() dto: CreateShiftTemplateDto, @CurrentUser() user: RequestUser) {
    return this.shifts.createTemplate(tenantId, dto, user.id);
  }

  @Get('shift-templates')
  listTemplates(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.shifts.listTemplates(tenantId, query);
  }

  @Patch('shift-templates/:id')
  updateTemplate(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateShiftTemplateDto, @CurrentUser() user: RequestUser) {
    return this.shifts.updateTemplate(tenantId, id, dto, user.id);
  }

  @Post('shift-sessions')
  createSession(@CurrentTenant() tenantId: string, @Body() dto: CreateShiftSessionDto, @CurrentUser() user: RequestUser) {
    return this.shifts.createSession(tenantId, dto, user.id);
  }

  @Get('shift-sessions')
  listSessions(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.shifts.listSessions(tenantId, query);
  }

  @Get('shift-sessions/:id')
  findSession(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.shifts.findSession(tenantId, id);
  }

  @Post('shift-sessions/:id/open')
  open(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.shifts.openSession(tenantId, id, user.id);
  }

  @Post('shift-sessions/:id/cancel')
  cancelSession(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.shifts.cancelSession(tenantId, id, user.id);
  }

  @Post('shift-sessions/:id/assignments')
  assign(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: AssignNozzlesDto, @CurrentUser() user: RequestUser) {
    return this.shifts.assignNozzles(tenantId, id, dto, user.id);
  }

  @Post('shift-sessions/:id/opening-readings')
  opening(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: ReadingsDto, @CurrentUser() user: RequestUser) {
    return this.shifts.recordOpeningReadings(tenantId, id, dto, user.id);
  }

  @Post('shift-sessions/:id/cash-submissions')
  cash(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: CashSubmissionsDto, @CurrentUser() user: RequestUser) {
    return this.shifts.recordCash(tenantId, id, dto, user.id);
  }

  @Post('shift-sessions/:id/close')
  close(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: CloseShiftDto, @CurrentUser() user: RequestUser) {
    return this.shifts.close(tenantId, id, dto, user.id);
  }
}
