import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportPerformanceIndexes1710000000021 implements MigrationInterface {
  name = 'AddReportPerformanceIndexes1710000000021';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pumper_cash_submissions_shift_tenant ON pumper_cash_submissions(shift_session_id, tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pumper_cash_submissions_tenant_created ON pumper_cash_submissions(tenant_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pumper_cash_submissions_tenant_pumper ON pumper_cash_submissions(tenant_id, pumper_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_balances_tenant_updated ON stock_balances(tenant_id, updated_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant_status_category ON products(tenant_id, status, category)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant_name ON products(tenant_id, product_name)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pump_meter_readings_tenant_updated ON pump_meter_readings(tenant_id, updated_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pump_meter_readings_shift_tenant ON pump_meter_readings(shift_session_id, tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pump_meter_readings_tenant_pumper ON pump_meter_readings(tenant_id, pumper_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_staff_shift_attendance_shift_tenant ON staff_shift_attendance(shift_session_id, tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_staff_shift_attendance_tenant_staff ON staff_shift_attendance(tenant_id, staff_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_salary_deductions_tenant_created ON salary_deductions(tenant_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_salary_deductions_tenant_status ON salary_deductions(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_salary_deductions_tenant_source ON salary_deductions(tenant_id, source_type)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bowser_receipts_tenant_received ON bowser_receipts(tenant_id, received_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_bowser_receipt_lines_receipt_tenant ON bowser_receipt_lines(bowser_receipt_id, tenant_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_orders_tenant_order_date ON stock_orders(tenant_id, order_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_order_items_order_tenant ON stock_order_items(stock_order_id, tenant_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_credit_sales_tenant_created ON credit_sales(tenant_id, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_credit_sales_tenant_customer ON credit_sales(tenant_id, customer_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cheque_registry_tenant_received ON cheque_registry(tenant_id, received_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cheque_registry_tenant_customer ON cheque_registry(tenant_id, customer_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_daily_cash_balances_tenant_deposit ON daily_cash_balances(tenant_id, business_date, bank_deposit)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cpc_stock_reports_tenant_report_date ON cpc_stock_reports(tenant_id, report_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cpc_stock_report_lines_report_tenant ON cpc_stock_report_lines(report_id, tenant_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cpc_stock_report_lines_report_tenant`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cpc_stock_reports_tenant_report_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_daily_cash_balances_tenant_deposit`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cheque_registry_tenant_customer`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cheque_registry_tenant_received`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_credit_sales_tenant_customer`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_credit_sales_tenant_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_order_items_order_tenant`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_orders_tenant_order_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bowser_receipt_lines_receipt_tenant`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bowser_receipts_tenant_received`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_salary_deductions_tenant_source`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_salary_deductions_tenant_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_salary_deductions_tenant_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_shift_attendance_tenant_staff`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_shift_attendance_shift_tenant`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pump_meter_readings_tenant_pumper`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pump_meter_readings_shift_tenant`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pump_meter_readings_tenant_updated`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_tenant_name`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_tenant_status_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_balances_tenant_updated`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pumper_cash_submissions_tenant_pumper`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pumper_cash_submissions_tenant_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pumper_cash_submissions_shift_tenant`);
  }
}
