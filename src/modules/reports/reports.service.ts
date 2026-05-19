import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { paginated, safeSortBy, sortDirection } from '../../common/dto';
import { GenerateCpcStockReportDto, ReportQueryDto, SubmitCpcStockReportDto } from './dto/report-query.dto';

interface SqlParts {
  where: string[];
  params: unknown[];
}

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async dashboard(tenantId: string) {
    const [todaySales, activeShift, stockRows, shortfallCount, pendingApprovals, credit, cheques] = await Promise.all([
      this.scalar(
        'select coalesce(sum(expected_cash::numeric), 0) value from pumper_cash_submissions where tenant_id = $1 and created_at::date = current_date',
        [tenantId],
      ),
      this.scalar("select count(*) value from shift_sessions where tenant_id = $1 and status in ('ACTIVE','OPEN','CLOSING')", [tenantId]),
      this.dataSource.query(
        `select p.product_code, p.product_name, p.category, b.quantity_on_hand
           from stock_balances b
           join products p on p.id = b.product_id
          where b.tenant_id = $1
          order by p.category, p.product_name
          limit 8`,
        [tenantId],
      ),
      this.scalar("select count(*) value from salary_deductions where tenant_id = $1 and source_type = 'CASH_SHORTFALL' and status = 'PENDING_APPROVAL'", [
        tenantId,
      ]),
      this.scalar("select count(*) value from salary_deductions where tenant_id = $1 and status = 'PENDING_APPROVAL'", [tenantId]),
      this.scalar('select coalesce(sum(outstanding_balance::numeric), 0) value from credit_customers where tenant_id = $1', [tenantId]),
      this.scalar("select count(*) value from cheque_registry where tenant_id = $1 and status in ('RECEIVED','DEPOSITED')", [tenantId]),
    ]);
    return {
      today_sales: todaySales,
      active_shift_count: activeShift,
      fuel_stock_summary: stockRows,
      cash_shortfall_count: shortfallCount,
      pending_approvals: pendingApprovals,
      credit_outstanding: credit,
      cheques_pending: cheques,
    };
  }

  shiftSummary(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 's.business_date', 's.tenant_id');
    if (query.status) parts.where.push(`s.status = $${this.push(parts, query.status)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(st.shift_name ilike $${this.push(parts, search)} or s.status ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select s.id, s.business_date, st.shift_name, s.status,
              coalesce(sum(c.expected_cash::numeric),0) expected_cash,
              coalesce(sum(c.actual_cash::numeric),0) actual_cash,
              coalesce(sum(c.shortfall::numeric),0) shortfall,
              coalesce(sum(c.excess::numeric),0) excess
         from shift_sessions s
         join shift_templates st on st.id = s.shift_template_id
         left join pumper_cash_submissions c on c.shift_session_id = s.id and c.tenant_id = s.tenant_id
        where ${parts.where.join(' and ')}
        group by s.id, st.shift_name`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { business_date: 'business_date', status: 'status', expected_cash: 'expected_cash' }, 'business_date'),
    );
  }

  stock(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'b.updated_at', 'b.tenant_id');
    if (query.status) parts.where.push(`p.status = $${this.push(parts, query.status)}`);
    if (query.product_id) parts.where.push(`p.id = $${this.push(parts, query.product_id)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(p.product_code ilike $${this.push(parts, search)} or p.product_name ilike $${this.push(parts, search)} or p.category ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select p.id product_id, p.product_code, p.product_name, p.category, p.status, b.quantity_on_hand, b.updated_at
         from stock_balances b
         join products p on p.id = b.product_id
        where ${parts.where.join(' and ')}`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { product_name: 'product_name', category: 'category', quantity_on_hand: 'quantity_on_hand', updated_at: 'updated_at' }, 'category'),
    );
  }

  pumpMeters(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'r.recorded_at', 'r.tenant_id');
    if (query.staff_id) parts.where.push(`r.pumper_id = $${this.push(parts, query.staff_id)}`);
    if (query.product_id) parts.where.push(`n.product_id = $${this.push(parts, query.product_id)}`);
    if (query.status) parts.where.push(`s.status = $${this.push(parts, query.status)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(p.pump_code ilike $${this.push(parts, search)} or n.nozzle_code ilike $${this.push(parts, search)} or pr.product_name ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select r.id, s.business_date, s.status shift_status, p.pump_code, p.pump_name,
              n.nozzle_code, n.nozzle_name, pr.product_name, staff.name pumper_name,
              r.reading_type, r.meter_reading, r.recorded_at
         from pump_meter_readings r
         join shift_sessions s on s.id = r.shift_session_id
         join pump_nozzles n on n.id = r.nozzle_id
         join pumps p on p.id = n.pump_id
         join products pr on pr.id = n.product_id
         left join staff_profiles staff on staff.id = r.pumper_id
        where ${parts.where.join(' and ')}`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { business_date: 'business_date', pump_code: 'pump_code', recorded_at: 'recorded_at' }, 'recorded_at'),
    );
  }

  attendance(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 's.business_date', 'a.tenant_id');
    if (query.status) parts.where.push(`a.attendance_status = $${this.push(parts, query.status)}`);
    if (query.staff_id) parts.where.push(`a.staff_id = $${this.push(parts, query.staff_id)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(staff.name ilike $${this.push(parts, search)} or staff.employee_no ilike $${this.push(parts, search)} or role.name ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select a.id, s.business_date, staff.employee_no, staff.name staff_name, role.name role_name,
              a.clock_in_at, a.clock_out_at, a.attendance_status
         from staff_shift_attendance a
         join shift_sessions s on s.id = a.shift_session_id
         join staff_profiles staff on staff.id = a.staff_id
         join operational_roles role on role.id = staff.operational_role_id
        where ${parts.where.join(' and ')}`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { business_date: 'business_date', staff_name: 'staff_name', role_name: 'role_name' }, 'business_date'),
    );
  }

  dailySales(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 's.business_date', 's.tenant_id');
    return this.rawPaginated(
      `select s.business_date,
              coalesce(sum(c.expected_cash::numeric),0) expected_cash,
              coalesce(sum(c.actual_cash::numeric),0) actual_cash,
              coalesce(sum(c.shortfall::numeric),0) shortfall,
              coalesce(sum(c.excess::numeric),0) excess,
              count(distinct s.id)::int shift_count
         from shift_sessions s
         left join pumper_cash_submissions c on c.shift_session_id = s.id and c.tenant_id = s.tenant_id
        where ${parts.where.join(' and ')}
        group by s.business_date`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { business_date: 'business_date', expected_cash: 'expected_cash', actual_cash: 'actual_cash' }, 'business_date'),
    );
  }

  pumperShortfalls(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'd.created_at', 'd.tenant_id');
    parts.where.push(`d.source_type = 'CASH_SHORTFALL'`);
    if (query.status) parts.where.push(`d.status = $${this.push(parts, query.status)}`);
    if (query.staff_id) parts.where.push(`d.staff_id = $${this.push(parts, query.staff_id)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(s.name ilike $${this.push(parts, search)} or s.employee_no ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select d.id, s.employee_no, s.name staff_name, d.amount, d.status, d.reason, d.created_at, ss.business_date
         from salary_deductions d
         join staff_profiles s on s.id = d.staff_id
         left join shift_sessions ss on ss.id = d.shift_session_id
        where ${parts.where.join(' and ')}`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { created_at: 'created_at', amount: 'amount', staff_name: 'staff_name', business_date: 'business_date' }, 'created_at'),
    );
  }

  payrollDeductions(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'd.created_at', 'd.tenant_id');
    if (query.status) parts.where.push(`d.status = $${this.push(parts, query.status)}`);
    if (query.staff_id) parts.where.push(`d.staff_id = $${this.push(parts, query.staff_id)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(s.name ilike $${this.push(parts, search)} or s.employee_no ilike $${this.push(parts, search)} or d.source_type ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select d.*, s.employee_no, s.name staff_name
         from salary_deductions d
         join staff_profiles s on s.id = d.staff_id
        where ${parts.where.join(' and ')}`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { created_at: 'created_at', amount: 'amount', status: 'status', staff_name: 'staff_name' }, 'created_at'),
    );
  }

  bowserReceipts(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'r.received_date', 'r.tenant_id');
    if (query.status) parts.where.push(`r.status = $${this.push(parts, query.status)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(r.receipt_no ilike $${this.push(parts, search)} or r.supplier_name ilike $${this.push(parts, search)} or r.vehicle_no ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select r.id, r.receipt_no, r.supplier_name, r.vehicle_no, r.received_date, r.status,
              coalesce(sum(l.received_litres::numeric),0) received_litres,
              coalesce(sum(l.total_cost::numeric),0) total_cost
         from bowser_receipts r
         left join bowser_receipt_lines l on l.bowser_receipt_id = r.id and l.tenant_id = r.tenant_id
        where ${parts.where.join(' and ')}
        group by r.id`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { received_date: 'received_date', receipt_no: 'receipt_no', total_cost: 'total_cost', status: 'status' }, 'received_date'),
    );
  }

  stockOrders(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'o.order_date', 'o.tenant_id');
    if (query.status) parts.where.push(`o.status = $${this.push(parts, query.status)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(o.order_no ilike $${this.push(parts, search)} or o.supplier_name ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select o.id, o.order_no, o.supplier_name, o.order_date, o.expected_delivery_date, o.status,
              coalesce(sum(i.ordered_quantity::numeric),0) ordered_quantity,
              coalesce(sum(i.total_cost::numeric),0) total_cost
         from stock_orders o
         left join stock_order_items i on i.stock_order_id = o.id and i.tenant_id = o.tenant_id
        where ${parts.where.join(' and ')}
        group by o.id`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { order_date: 'order_date', order_no: 'order_no', total_cost: 'total_cost', status: 'status' }, 'order_date'),
    );
  }

  creditDues(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'cs.created_at', 'cs.tenant_id');
    if (query.status) parts.where.push(`cs.status = $${this.push(parts, query.status)}`);
    if (query.customer_id) parts.where.push(`cs.customer_id = $${this.push(parts, query.customer_id)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(c.customer_name ilike $${this.push(parts, search)} or p.product_name ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select cs.id, c.customer_name, p.product_name, cs.quantity, cs.unit_price, cs.total_amount,
              cs.due_date, cs.status, cs.created_at
         from credit_sales cs
         join credit_customers c on c.id = cs.customer_id
         join products p on p.id = cs.product_id
        where ${parts.where.join(' and ')}`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { created_at: 'created_at', due_date: 'due_date', total_amount: 'total_amount', customer_name: 'customer_name' }, 'created_at'),
    );
  }

  cheques(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'ch.received_date', 'ch.tenant_id');
    if (query.status) parts.where.push(`ch.status = $${this.push(parts, query.status)}`);
    if (query.customer_id) parts.where.push(`ch.customer_id = $${this.push(parts, query.customer_id)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(ch.cheque_no ilike $${this.push(parts, search)} or ch.bank_name ilike $${this.push(parts, search)} or c.customer_name ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select ch.id, ch.cheque_no, ch.bank_name, ch.branch_name, c.customer_name,
              ch.amount, ch.cheque_date, ch.received_date, ch.deposit_date, ch.status
         from cheque_registry ch
         left join credit_customers c on c.id = ch.customer_id
        where ${parts.where.join(' and ')}`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { received_date: 'received_date', deposit_date: 'deposit_date', amount: 'amount', status: 'status' }, 'received_date'),
    );
  }

  bankDeposits(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'business_date', 'tenant_id');
    if (query.status) parts.where.push(`status = $${this.push(parts, query.status)}`);
    parts.where.push(`bank_deposit > 0`);
    return this.rawPaginated(
      `select id, business_date, expected_cash, actual_cash, bank_deposit, closing_cash, status
         from daily_cash_balances
        where ${parts.where.join(' and ')}`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { business_date: 'business_date', bank_deposit: 'bank_deposit', closing_cash: 'closing_cash' }, 'business_date'),
    );
  }

  async profitLoss(tenantId: string, query: ReportQueryDto) {
    const cash = this.parts(tenantId, query, 'created_at', 'tenant_id');
    const payments = this.parts(tenantId, query, 'payment_date', 'tenant_id');
    const deductions = this.parts(tenantId, query, 'created_at', 'tenant_id');
    const [sales, supplierPayments, approvedDeductions, creditOutstanding] = await Promise.all([
      this.scalar(`select coalesce(sum(expected_cash::numeric),0) value from pumper_cash_submissions where ${cash.where.join(' and ')}`, cash.params),
      this.scalar(`select coalesce(sum(amount::numeric),0) value from supplier_payments where ${payments.where.join(' and ')}`, payments.params),
      this.scalar(
        `select coalesce(sum(amount::numeric),0) value from salary_deductions where ${deductions.where.join(' and ')} and status = 'APPROVED'`,
        deductions.params,
      ),
      this.scalar('select coalesce(sum(outstanding_balance::numeric),0) value from credit_customers where tenant_id = $1', [tenantId]),
    ]);
    return {
      period: { date_from: query.date_from, date_to: query.date_to },
      revenue: sales,
      supplier_payments: supplierPayments,
      approved_deductions: approvedDeductions,
      gross_profit_estimate: sales - supplierPayments,
      net_profit_estimate: sales - supplierPayments + approvedDeductions,
      credit_outstanding: creditOutstanding,
    };
  }

  cpcStock(tenantId: string, query: ReportQueryDto) {
    const parts = this.parts(tenantId, query, 'r.report_date', 'r.tenant_id');
    if (query.status) parts.where.push(`r.status = $${this.push(parts, query.status)}`);
    const search = this.search(query);
    if (search) parts.where.push(`(r.report_type ilike $${this.push(parts, search)} or p.product_name ilike $${this.push(parts, search)} or p.product_code ilike $${this.push(parts, search)})`);
    return this.rawPaginated(
      `select r.id report_id, r.report_date, r.report_type, r.status, r.submitted_at,
              l.id line_id, p.product_code, p.product_name, p.category,
              l.opening_stock, l.received_stock, l.sold_quantity, l.closing_stock, l.remarks
         from cpc_stock_reports r
         left join cpc_stock_report_lines l on l.report_id = r.id and l.tenant_id = r.tenant_id
         left join products p on p.id = l.product_id
        where ${parts.where.join(' and ')}`,
      parts.params,
      query,
      safeSortBy(query.sort_by, { report_date: 'report_date', report_type: 'report_type', status: 'status', product_name: 'product_name' }, 'report_date'),
    );
  }

  async generateCpcStock(tenantId: string, dto: GenerateCpcStockReportDto, actorUserId: string) {
    const reportType = dto.report_type ?? 'DAILY_STOCK';
    const exists = await this.dataSource.query(
      `select id from cpc_stock_reports where tenant_id = $1 and report_date = $2 and report_type = $3 limit 1`,
      [tenantId, dto.report_date, reportType],
    );
    if (exists.length) {
      throw new BadRequestException('CPC stock report already exists for this date and type');
    }

    await this.dataSource.transaction(async (manager) => {
      const reportRows = await manager.query(
        `insert into cpc_stock_reports (tenant_id, report_date, report_type, generated_by, status)
         values ($1, $2, $3, $4, 'GENERATED')
         returning *`,
        [tenantId, dto.report_date, reportType, actorUserId],
      );
      const report = reportRows[0];

      await manager.query(
        `insert into cpc_stock_report_lines (
            tenant_id, report_id, product_id, opening_stock, received_stock, sold_quantity, closing_stock, remarks
         )
         select
            p.tenant_id,
            $2::uuid report_id,
            p.id product_id,
            greatest(
              coalesce(b.quantity_on_hand::numeric, 0)
              - coalesce(sum(case when sm.created_at::date = $3::date then sm.quantity_in::numeric else 0 end), 0)
              + coalesce(sum(case when sm.created_at::date = $3::date then sm.quantity_out::numeric else 0 end), 0),
              0
            ) opening_stock,
            coalesce(sum(case when sm.created_at::date = $3::date then sm.quantity_in::numeric else 0 end), 0) received_stock,
            coalesce(sum(case when sm.created_at::date = $3::date then sm.quantity_out::numeric else 0 end), 0) sold_quantity,
            coalesce(b.quantity_on_hand::numeric, 0) closing_stock,
            null remarks
           from products p
           left join stock_balances b on b.product_id = p.id and b.tenant_id = p.tenant_id
           left join stock_movements sm on sm.product_id = p.id and sm.tenant_id = p.tenant_id and sm.created_at::date = $3::date
          where p.tenant_id = $1 and p.status = 'ACTIVE'
          group by p.tenant_id, p.id, b.quantity_on_hand
          order by p.category, p.product_name`,
        [tenantId, report.id, dto.report_date],
      );

      await manager.query(
        `insert into audit_logs (tenant_id, actor_user_id, module_name, action, new_value)
         values ($1, $2, 'cpc_compliance', 'GENERATE_STOCK_REPORT', $3::jsonb)`,
        [tenantId, actorUserId, JSON.stringify({ report_id: report.id, report_date: dto.report_date, report_type: reportType })],
      );

      return report;
    });
    return this.cpcStock(tenantId, { page: 1, limit: 100, date_from: dto.report_date, date_to: dto.report_date, sort_order: 'ASC' });
  }

  async submitCpcStock(tenantId: string, id: string, dto: SubmitCpcStockReportDto, actorUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `update cpc_stock_reports
            set status = 'SUBMITTED', submitted_at = now()
          where tenant_id = $1 and id = $2 and status in ('GENERATED', 'DRAFT')
          returning *`,
        [tenantId, id],
      );
      if (!rows.length) {
        throw new NotFoundException('Generated CPC stock report not found');
      }
      await manager.query(
        `insert into audit_logs (tenant_id, actor_user_id, module_name, action, new_value)
         values ($1, $2, 'cpc_compliance', 'SUBMIT_STOCK_REPORT', $3::jsonb)`,
        [tenantId, actorUserId, JSON.stringify({ report_id: id, remarks: dto.remarks })],
      );
      return rows[0];
    });
  }

  private parts(tenantId: string, query: ReportQueryDto, dateColumn?: string, tenantColumn = 'tenant_id'): SqlParts {
    const parts: SqlParts = { where: [`${tenantColumn} = $1`], params: [tenantId] };
    if (dateColumn && query.date_from) parts.where.push(`${dateColumn} >= $${this.push(parts, query.date_from)}::date`);
    if (dateColumn && query.date_to) parts.where.push(`${dateColumn} < ($${this.push(parts, query.date_to)}::date + interval '1 day')`);
    return parts;
  }

  private search(query: ReportQueryDto): string | undefined {
    const trimmed = query.search?.trim();
    return trimmed ? `%${trimmed.replace(/[%_]/g, '\\$&')}%` : undefined;
  }

  private push(parts: SqlParts, value: unknown): number {
    parts.params.push(value);
    return parts.params.length;
  }

  private async rawPaginated<T extends Record<string, unknown>>(
    baseSql: string,
    params: unknown[],
    query: ReportQueryDto,
    sortBy: string,
  ) {
    const direction = sortDirection(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const offset = (page - 1) * limit;
    const countRows = await this.dataSource.query(`select count(*)::int total from (${baseSql}) report_rows`, params);
    const data = await this.dataSource.query(`${baseSql} order by ${sortBy} ${direction} limit $${params.length + 1} offset $${params.length + 2}`, [
      ...params,
      limit,
      offset,
    ]);
    return paginated<T>(data, Number(countRows[0]?.total ?? 0), query);
  }

  private async scalar(sql: string, params: unknown[]) {
    const rows = await this.dataSource.query(sql, params);
    return Number(rows[0]?.value ?? 0);
  }
}
