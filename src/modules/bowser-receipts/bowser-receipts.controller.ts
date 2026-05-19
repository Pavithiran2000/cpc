import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { BowserReceiptsService } from './bowser-receipts.service';
import { ApproveBowserReceiptDto, CreateBowserReceiptDto } from './dto/bowser-receipt.dto';

@Controller('bowser-receipts')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class BowserReceiptsController {
  constructor(private readonly receipts: BowserReceiptsService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateBowserReceiptDto, @CurrentUser() user: RequestUser) {
    return this.receipts.create(tenantId, dto, user.id);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.receipts.list(tenantId, query);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.receipts.findOne(tenantId, id);
  }

  @Post(':id/approve')
  approve(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: ApproveBowserReceiptDto, @CurrentUser() user: RequestUser) {
    return this.receipts.approve(tenantId, id, dto, user.id);
  }
}
