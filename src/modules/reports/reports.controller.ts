import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { GenerateCpcStockReportDto, ReportQueryDto, SubmitCpcStockReportDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  dashboard(@CurrentTenant() tenantId: string) {
    return this.reports.dashboard(tenantId);
  }

  @Get('shift-summary')
  shiftSummary(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.shiftSummary(tenantId, query);
  }

  @Get('stock')
  stock(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.stock(tenantId, query);
  }

  @Get('pump-meters')
  pumpMeters(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.pumpMeters(tenantId, query);
  }

  @Get('attendance')
  attendance(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.attendance(tenantId, query);
  }

  @Get('daily-sales')
  dailySales(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.dailySales(tenantId, query);
  }

  @Get('pumper-shortfalls')
  pumperShortfalls(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.pumperShortfalls(tenantId, query);
  }

  @Get('payroll-deductions')
  payrollDeductions(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.payrollDeductions(tenantId, query);
  }

  @Get('bowser-receipts')
  bowserReceipts(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.bowserReceipts(tenantId, query);
  }

  @Get('stock-orders')
  stockOrders(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.stockOrders(tenantId, query);
  }

  @Get('credit-dues')
  creditDues(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.creditDues(tenantId, query);
  }

  @Get('cheques')
  cheques(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.cheques(tenantId, query);
  }

  @Get('bank-deposits')
  bankDeposits(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.bankDeposits(tenantId, query);
  }

  @Get('profit-loss')
  profitLoss(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.profitLoss(tenantId, query);
  }

  @Get('cpc-stock')
  cpcStock(@CurrentTenant() tenantId: string, @Query() query: ReportQueryDto) {
    return this.reports.cpcStock(tenantId, query);
  }

  @Post('cpc-stock/generate')
  generateCpcStock(@CurrentTenant() tenantId: string, @Body() dto: GenerateCpcStockReportDto, @CurrentUser() user: RequestUser) {
    return this.reports.generateCpcStock(tenantId, dto, user.id);
  }

  @Post('cpc-stock/:id/submit')
  submitCpcStock(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SubmitCpcStockReportDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.reports.submitCpcStock(tenantId, id, dto, user.id);
  }
}
