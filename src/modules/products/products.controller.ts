import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { CreatePriceDto } from './dto/create-price.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateProductDto, @CurrentUser() user: RequestUser) {
    return this.products.create(tenantId, dto, user.id);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.products.list(tenantId, query);
  }

  @Patch(':id')
  update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: RequestUser) {
    return this.products.update(tenantId, id, dto, user.id);
  }

  @Post(':id/prices')
  createPrice(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: CreatePriceDto, @CurrentUser() user: RequestUser) {
    return this.products.createPrice(tenantId, id, dto, user.id);
  }

  @Get(':id/prices')
  listPrices(@CurrentTenant() tenantId: string, @Param('id') id: string, @Query() query: ListQueryDto) {
    return this.products.listPrices(tenantId, id, query);
  }
}
