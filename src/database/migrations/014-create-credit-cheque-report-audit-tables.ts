import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCreditChequeReportAuditTables1710000000014 implements MigrationInterface {
  name = 'CreateCreditChequeReportAuditTables1710000000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE stock_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        order_no VARCHAR(100) NOT NULL,
        supplier_name VARCHAR(150),
        order_date DATE NOT NULL,
        expected_delivery_date DATE,
        status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        created_by UUID REFERENCES portal_users(id),
        approved_by UUID REFERENCES portal_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, order_no)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE stock_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        stock_order_id UUID NOT NULL REFERENCES stock_orders(id),
        product_id UUID NOT NULL REFERENCES products(id),
        ordered_quantity NUMERIC(14,3) NOT NULL,
        unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_cost NUMERIC(12,2) NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`
      CREATE TABLE supplier_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        stock_order_id UUID REFERENCES stock_orders(id),
        payment_type VARCHAR(50) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        payment_date DATE NOT NULL,
        reference_no VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'RECORDED',
        created_by UUID REFERENCES portal_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE bowser_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        receipt_no VARCHAR(100) NOT NULL,
        supplier_name VARCHAR(150),
        vehicle_no VARCHAR(50),
        driver_name VARCHAR(150),
        received_date DATE NOT NULL,
        received_by UUID REFERENCES portal_users(id),
        stock_order_id UUID REFERENCES stock_orders(id),
        status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, receipt_no)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE bowser_receipt_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        bowser_receipt_id UUID NOT NULL REFERENCES bowser_receipts(id),
        tank_id UUID NOT NULL REFERENCES fuel_tanks(id),
        product_id UUID NOT NULL REFERENCES products(id),
        received_litres NUMERIC(14,3) NOT NULL,
        unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_cost NUMERIC(12,2) NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`
      CREATE TABLE credit_customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        customer_name VARCHAR(150) NOT NULL,
        phone VARCHAR(30),
        address TEXT,
        credit_limit NUMERIC(12,2) DEFAULT 0,
        outstanding_balance NUMERIC(12,2) DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE credit_sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shift_session_id UUID REFERENCES shift_sessions(id),
        customer_id UUID NOT NULL REFERENCES credit_customers(id),
        product_id UUID NOT NULL REFERENCES products(id),
        quantity NUMERIC(14,3) NOT NULL,
        unit_price NUMERIC(12,2) NOT NULL,
        total_amount NUMERIC(12,2) NOT NULL,
        due_date DATE,
        status VARCHAR(30) NOT NULL DEFAULT 'OUTSTANDING',
        created_by UUID REFERENCES portal_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE due_collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        customer_id UUID NOT NULL REFERENCES credit_customers(id),
        credit_sale_id UUID REFERENCES credit_sales(id),
        amount_collected NUMERIC(12,2) NOT NULL,
        collection_date DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        received_by UUID REFERENCES portal_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE cheque_registry (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        customer_id UUID REFERENCES credit_customers(id),
        cheque_no VARCHAR(100) NOT NULL,
        bank_name VARCHAR(150),
        branch_name VARCHAR(150),
        cheque_date DATE,
        amount NUMERIC(12,2) NOT NULL,
        received_date DATE NOT NULL,
        deposit_date DATE,
        status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
        created_by UUID REFERENCES portal_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE cpc_stock_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        report_date DATE NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        generated_by UUID REFERENCES portal_users(id),
        submitted_at TIMESTAMPTZ,
        status VARCHAR(30) NOT NULL DEFAULT 'GENERATED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE cpc_stock_report_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        report_id UUID NOT NULL REFERENCES cpc_stock_reports(id),
        product_id UUID NOT NULL REFERENCES products(id),
        opening_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
        received_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
        sold_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
        closing_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
        remarks TEXT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        actor_user_id UUID REFERENCES portal_users(id),
        module_name VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    for (const table of [
      'stock_orders',
      'stock_order_items',
      'supplier_payments',
      'bowser_receipts',
      'bowser_receipt_lines',
      'credit_customers',
      'credit_sales',
      'due_collections',
      'cheque_registry',
      'cpc_stock_reports',
      'cpc_stock_report_lines',
      'audit_logs',
    ]) {
      await queryRunner.query(`CREATE INDEX idx_${table}_tenant_id ON ${table}(tenant_id)`);
    }
    await queryRunner.query(`CREATE INDEX idx_credit_sales_tenant_due_date ON credit_sales(tenant_id, due_date)`);
    await queryRunner.query(`CREATE INDEX idx_cheque_registry_tenant_status ON cheque_registry(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_cpc_stock_reports_tenant_date ON cpc_stock_reports(tenant_id, report_date)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE audit_logs`);
    await queryRunner.query(`DROP TABLE cpc_stock_report_lines`);
    await queryRunner.query(`DROP TABLE cpc_stock_reports`);
    await queryRunner.query(`DROP TABLE cheque_registry`);
    await queryRunner.query(`DROP TABLE due_collections`);
    await queryRunner.query(`DROP TABLE credit_sales`);
    await queryRunner.query(`DROP TABLE credit_customers`);
    await queryRunner.query(`DROP TABLE bowser_receipt_lines`);
    await queryRunner.query(`DROP TABLE bowser_receipts`);
    await queryRunner.query(`DROP TABLE supplier_payments`);
    await queryRunner.query(`DROP TABLE stock_order_items`);
    await queryRunner.query(`DROP TABLE stock_orders`);
  }
}
