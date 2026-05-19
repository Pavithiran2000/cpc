import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { InventoryService } from './inventory.service';
import { CreateFuelTankDto, NightVerificationDto, StockAdjustmentDto } from './dto/inventory.dto';

@Controller()
@Roles(PortalRole.Admin, PortalRole.Owner)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('stock-balances')
  balances(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.inventory.balancesForTenant(tenantId, query);
  }

  @Get('stock-movements')
  movements(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.inventory.movementsForTenant(tenantId, query);
  }

  @Post('tanks')
  createTank(@CurrentTenant() tenantId: string, @Body() dto: CreateFuelTankDto, @CurrentUser() user: RequestUser) {
    return this.inventory.createTank(tenantId, dto, user.id);
  }

  @Get('tanks')
  tanks(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.inventory.listTanks(tenantId, query);
  }

  @Post('stock-adjustments')
  adjust(@CurrentTenant() tenantId: string, @Body() dto: StockAdjustmentDto, @CurrentUser() user: RequestUser) {
    return this.inventory.adjust(tenantId, dto, user.id);
  }

  @Post('stock-verifications/night')
  nightVerification(@CurrentTenant() tenantId: string, @Body() dto: NightVerificationDto, @CurrentUser() user: RequestUser) {
    return this.inventory.nightVerification(tenantId, dto, user.id);
  }
}
