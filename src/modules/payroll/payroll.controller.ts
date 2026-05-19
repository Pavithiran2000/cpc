import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreatePayrollRunDto, FinalizePayrollRunDto } from './dto/payroll.dto';
import { PayrollService } from './payroll.service';

@Controller()
@Roles(PortalRole.Admin, PortalRole.Owner)
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Post('payroll-runs')
  createRun(@CurrentTenant() tenantId: string, @Body() dto: CreatePayrollRunDto, @CurrentUser() user: RequestUser) {
    return this.payroll.createRun(tenantId, dto, user.id);
  }

  @Get('payroll-runs')
  listRuns(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.payroll.listRuns(tenantId, query);
  }

  @Post('payroll-runs/:id/finalize')
  finalize(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: FinalizePayrollRunDto, @CurrentUser() user: RequestUser) {
    return this.payroll.finalizeRun(tenantId, id, dto, user.id);
  }

  @Get('salary-deductions')
  deductions(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.payroll.salaryDeductions(tenantId, query);
  }

  @Post('salary-deductions/:id/approve')
  approveDeduction(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.payroll.approveDeduction(tenantId, id, user.id);
  }
}
