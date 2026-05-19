import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreditDuesService } from './credit-dues.service';
import { CreateCreditCustomerDto, CreateCreditSaleDto, CreateDueCollectionDto } from './dto/credit-dues.dto';

@Controller()
@Roles(PortalRole.Admin, PortalRole.Owner)
export class CreditDuesController {
  constructor(private readonly credit: CreditDuesService) {}

  @Post('credit-customers')
  createCustomer(@CurrentTenant() tenantId: string, @Body() dto: CreateCreditCustomerDto) {
    return this.credit.createCustomer(tenantId, dto);
  }

  @Get('credit-customers')
  listCustomers(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.credit.listCustomers(tenantId, query);
  }

  @Post('credit-sales')
  createSale(@CurrentTenant() tenantId: string, @Body() dto: CreateCreditSaleDto, @CurrentUser() user: RequestUser) {
    return this.credit.createCreditSale(tenantId, dto, user.id);
  }

  @Get('credit-sales')
  listSales(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.credit.listSales(tenantId, query);
  }

  @Post('due-collections')
  createCollection(@CurrentTenant() tenantId: string, @Body() dto: CreateDueCollectionDto, @CurrentUser() user: RequestUser) {
    return this.credit.createDueCollection(tenantId, dto, user.id);
  }

  @Get('due-collections')
  listCollections(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.credit.listCollections(tenantId, query);
  }
}
