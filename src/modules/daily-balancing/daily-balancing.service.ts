import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { calculateCashVariance, money } from '../../common/utils/calculations';
import { DailyCashBalance, ShiftSession } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateDailyBalanceDto } from './dto/daily-balancing.dto';

@Injectable()
export class DailyBalancingService {
  constructor(
    @InjectRepository(DailyCashBalance) private readonly balances: Repository<DailyCashBalance>,
    @InjectRepository(ShiftSession) private readonly sessions: Repository<ShiftSession>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto) {
    const qb = this.balances.createQueryBuilder('balance').where('balance.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'balance',
      statusColumn: 'balance.status',
      dateColumn: 'balance.businessDate',
      sortColumns: {
        business_date: 'balance.businessDate',
        expected_cash: 'balance.expectedCash',
        actual_cash: 'balance.actualCash',
        bank_deposit: 'balance.bankDeposit',
        status: 'balance.status',
      },
      defaultSort: 'balance.businessDate',
    });
  }

  async upsert(tenantId: string, dto: CreateDailyBalanceDto, actorUserId: string) {
    const variance = calculateCashVariance(dto.expected_cash, dto.actual_cash);
    const existing = await this.balances.findOne({ where: { tenantId, businessDate: dto.business_date } });
    const balance = await this.balances.save(
      this.balances.create({
        ...existing,
        tenantId,
        businessDate: dto.business_date,
        openingCash: money(dto.opening_cash ?? 0),
        expectedCash: money(dto.expected_cash),
        actualCash: money(dto.actual_cash),
        shortfall: money(variance.shortfall),
        excess: money(variance.excess),
        bankDeposit: money(dto.bank_deposit ?? 0),
        closingCash: money((dto.opening_cash ?? 0) + dto.actual_cash - (dto.bank_deposit ?? 0)),
        status: dto.status ?? (variance.shortfall > 0 ? 'SHORTAGE' : variance.excess > 0 ? 'EXCESS' : 'BALANCED'),
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'daily_balancing', action: 'UPSERT', newValue: balance });
    return balance;
  }

  async close(tenantId: string, id: string, actorUserId: string) {
    const balance = await this.balances.findOne({ where: { tenantId, id } });
    if (!balance) throw new NotFoundException('Daily balance not found');
    const openSessions = await this.sessions.count({
      where: [
        { tenantId, businessDate: balance.businessDate, status: 'ACTIVE' },
        { tenantId, businessDate: balance.businessDate, status: 'CLOSING' },
        { tenantId, businessDate: balance.businessDate, status: 'OPEN' },
      ],
    });
    if (openSessions > 0) throw new BadRequestException('Cannot close daily balance with unresolved shift sessions');
    balance.status = 'CLOSED';
    const saved = await this.balances.save(balance);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'daily_balancing', action: 'CLOSE', newValue: { id } });
    return saved;
  }
}
