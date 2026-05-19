import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { money } from '../../common/utils/calculations';
import { ChequeRegistry } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateChequeDto, UpdateChequeStatusDto } from './dto/cheque.dto';

@Injectable()
export class ChequesService {
  constructor(
    @InjectRepository(ChequeRegistry) private readonly cheques: Repository<ChequeRegistry>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto) {
    const qb = this.cheques.createQueryBuilder('cheque').where('cheque.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'cheque',
      searchColumns: ['cheque.chequeNo', 'cheque.bankName', 'cheque.branchName'],
      statusColumn: 'cheque.status',
      dateColumn: 'cheque.receivedDate',
      sortColumns: {
        cheque_no: 'cheque.chequeNo',
        bank_name: 'cheque.bankName',
        received_date: 'cheque.receivedDate',
        deposit_date: 'cheque.depositDate',
        amount: 'cheque.amount',
        status: 'cheque.status',
      },
      defaultSort: 'cheque.receivedDate',
    });
  }

  async create(tenantId: string, dto: CreateChequeDto, actorUserId: string) {
    const cheque = await this.cheques.save(
      this.cheques.create({
        tenantId,
        customerId: dto.customer_id,
        chequeNo: dto.cheque_no,
        bankName: dto.bank_name,
        branchName: dto.branch_name,
        chequeDate: dto.cheque_date,
        amount: money(dto.amount),
        receivedDate: dto.received_date,
        depositDate: dto.deposit_date,
        createdBy: actorUserId,
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'cheque_registry', action: 'CREATE', newValue: cheque });
    return cheque;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateChequeStatusDto, actorUserId: string) {
    const cheque = await this.cheques.findOne({ where: { tenantId, id } });
    if (!cheque) throw new NotFoundException('Cheque not found');
    const oldValue = { status: cheque.status };
    cheque.status = dto.status;
    const saved = await this.cheques.save(cheque);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'cheque_registry', action: 'STATUS_CHANGE', oldValue, newValue: { id, status: dto.status } });
    return saved;
  }
}
