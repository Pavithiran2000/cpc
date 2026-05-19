import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListQueryDto } from '../../common/dto';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { RequestUser } from '../../common/types/request-user.type';
import { ChequesService } from './cheques.service';
import { CreateChequeDto, UpdateChequeStatusDto } from './dto/cheque.dto';

@Controller('cheques')
@Roles(PortalRole.Admin, PortalRole.Owner)
export class ChequesController {
  constructor(private readonly cheques: ChequesService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateChequeDto, @CurrentUser() user: RequestUser) {
    return this.cheques.create(tenantId, dto, user.id);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query() query: ListQueryDto) {
    return this.cheques.list(tenantId, query);
  }

  @Patch(':id/status')
  updateStatus(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateChequeStatusDto, @CurrentUser() user: RequestUser) {
    return this.cheques.updateStatus(tenantId, id, dto, user.id);
  }
}
