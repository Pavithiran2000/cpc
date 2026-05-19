import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateStockOrderDto, SupplierPaymentDto } from './dto/stock-order.dto';
import { StockOrdersService } from './stock-orders.service';

@Controller('stock-orders')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class StockOrdersController {
  constructor(private readonly orders: StockOrdersService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateStockOrderDto, @CurrentUser() user: RequestUser) {
    return this.orders.create(tenantId, dto, user.id);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.orders.list(tenantId, query);
  }

  @Post(':id/approve')
  approve(@CurrentTenant() tenantId: string, @Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.orders.approve(tenantId, id, user.id);
  }

  @Post(':id/payments')
  payment(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: SupplierPaymentDto, @CurrentUser() user: RequestUser) {
    return this.orders.createPayment(tenantId, { ...dto, stock_order_id: id }, user.id);
  }
}
