import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PortalRole } from '../../common/enums/portal-role.enum';

export abstract class UuidEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}

export abstract class TimestampedEntity extends UuidEntity {
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
}

export abstract class TenantEntity extends TimestampedEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;
}

@Entity('tenants')
export class Tenant extends TimestampedEntity {
  @Column({ name: 'station_code', length: 50, unique: true })
  stationCode: string;

  @Column({ name: 'station_name', length: 150 })
  stationName: string;

  @Column({ name: 'owner_name', length: 150, nullable: true })
  ownerName?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'address_line1', length: 150, nullable: true })
  addressLine1?: string;

  @Column({ name: 'address_line2', length: 150, nullable: true })
  addressLine2?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 100, nullable: true })
  district?: string;

  @Column({ length: 100, nullable: true })
  province?: string;

  @Column({ name: 'postal_code', length: 30, nullable: true })
  postalCode?: string;

  @Column({ length: 100, default: 'Sri Lanka' })
  country: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude?: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude?: string;

  @Column({ name: 'geo_city_id', type: 'int', nullable: true })
  geoCityId?: number;

  @Column({ name: 'contact_number', length: 30, nullable: true })
  contactNumber?: string;

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;
}

@Entity('tenant_settings')
@Index(['tenantId', 'settingKey'], { unique: true })
export class TenantSetting extends TenantEntity {
  @Column({ name: 'setting_key', length: 100 })
  settingKey: string;

  @Column({ name: 'setting_value', type: 'text', nullable: true })
  settingValue?: string;
}

@Entity('portal_users')
@Index(['tenantId', 'email'], { unique: true })
export class PortalUser extends TenantEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ length: 150 })
  email: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ name: 'portal_role', length: 30 })
  portalRole: PortalRole;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', type: 'text', nullable: true })
  twoFactorSecret?: string;

  @Column({ name: 'two_factor_pending_secret', type: 'text', nullable: true })
  twoFactorPendingSecret?: string;

  @Column({ name: 'reset_password_token', type: 'text', nullable: true })
  resetPasswordToken?: string;

  @Column({ name: 'reset_password_expires_at', type: 'timestamptz', nullable: true })
  resetPasswordExpiresAt?: Date;
}

@Entity('operational_roles')
@Index(['tenantId', 'name'], { unique: true })
export class OperationalRole extends TenantEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ name: 'requires_attendance', default: false })
  requiresAttendance: boolean;

  @Column({ name: 'liable_for_cash_shortfall', default: false })
  liableForCashShortfall: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;
}

@Entity('staff_profiles')
@Index(['tenantId', 'employeeNo'], { unique: true })
export class StaffProfile extends TenantEntity {
  @Column({ name: 'employee_no', length: 50 })
  employeeNo: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ length: 30, nullable: true })
  nic?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'operational_role_id', type: 'uuid' })
  operationalRoleId: string;

  @ManyToOne(() => OperationalRole)
  @JoinColumn({ name: 'operational_role_id' })
  operationalRole?: OperationalRole;

  @Column({ name: 'basic_salary', type: 'numeric', precision: 12, scale: 2, default: 0 })
  basicSalary: string;

  @Column({ name: 'shift_rate', type: 'numeric', precision: 12, scale: 2, default: 0 })
  shiftRate: string;

  @Column({ name: 'ot_rate', type: 'numeric', precision: 12, scale: 2, default: 0 })
  otRate: string;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'joined_date', type: 'date', nullable: true })
  joinedDate?: string;
}

@Entity('measurement_units')
export class MeasurementUnit extends UuidEntity {
  @Column({ length: 30, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'decimal_precision', type: 'int', default: 2 })
  decimalPrecision: number;
}

@Entity('products')
@Index(['tenantId', 'productCode'], { unique: true })
export class Product extends TenantEntity {
  @Column({ name: 'product_code', length: 50 })
  productCode: string;

  @Column({ name: 'product_name', length: 150 })
  productName: string;

  @Column({ length: 50 })
  category: 'FUEL' | 'GAS' | 'LUBRICANT';

  @Column({ name: 'measurement_unit_id', type: 'uuid' })
  measurementUnitId: string;

  @Column({ name: 'is_fuel', default: false })
  isFuel: boolean;

  @Column({ name: 'is_lubricant', default: false })
  isLubricant: boolean;

  @Column({ name: 'is_gas', default: false })
  isGas: boolean;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;
}

@Entity('product_prices')
@Index(['tenantId', 'productId'])
export class ProductPrice extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'selling_price', type: 'numeric', precision: 12, scale: 2 })
  sellingPrice: string;

  @Column({ name: 'cost_price', type: 'numeric', precision: 12, scale: 2, default: 0 })
  costPrice: string;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo?: Date;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('shift_templates')
@Index(['tenantId', 'shiftName'], { unique: true })
export class ShiftTemplate extends TenantEntity {
  @Column({ name: 'shift_name', length: 100 })
  shiftName: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ name: 'is_night_shift', default: false })
  isNightShift: boolean;

  @Column({ name: 'sequence_no', type: 'int', default: 1 })
  sequenceNo: number;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;
}

@Entity('shift_sessions')
@Index(['tenantId', 'businessDate'])
@Index(['tenantId', 'status'])
export class ShiftSession extends TenantEntity {
  @Column({ name: 'shift_template_id', type: 'uuid' })
  shiftTemplateId: string;

  @Column({ name: 'business_date', type: 'date' })
  businessDate: string;

  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId?: string;

  @Column({ name: 'opened_by', type: 'uuid', nullable: true })
  openedBy?: string;

  @Column({ name: 'closed_by', type: 'uuid', nullable: true })
  closedBy?: string;

  @Column({ name: 'opened_at', type: 'timestamptz', nullable: true })
  openedAt?: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @Column({ length: 30, default: 'DRAFT' })
  status: string;
}

@Entity('staff_shift_attendance')
@Index(['tenantId', 'shiftSessionId', 'staffId'], { unique: true })
export class StaffShiftAttendance extends TenantEntity {
  @Column({ name: 'shift_session_id', type: 'uuid' })
  shiftSessionId: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  staffId: string;

  @Column({ name: 'clock_in_at', type: 'timestamptz', nullable: true })
  clockInAt?: Date;

  @Column({ name: 'clock_out_at', type: 'timestamptz', nullable: true })
  clockOutAt?: Date;

  @Column({ name: 'attendance_status', length: 30, default: 'PRESENT' })
  attendanceStatus: string;
}

@Entity('pumps')
@Index(['tenantId', 'pumpCode'], { unique: true })
export class Pump extends TenantEntity {
  @Column({ name: 'pump_code', length: 50 })
  pumpCode: string;

  @Column({ name: 'pump_name', length: 100 })
  pumpName: string;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;

  @OneToMany(() => PumpNozzle, (nozzle) => nozzle.pump)
  nozzles?: PumpNozzle[];
}

@Entity('pump_nozzles')
@Index(['tenantId', 'pumpId', 'nozzleCode'], { unique: true })
export class PumpNozzle extends TenantEntity {
  @Column({ name: 'pump_id', type: 'uuid' })
  pumpId: string;

  @ManyToOne(() => Pump, (pump) => pump.nozzles)
  @JoinColumn({ name: 'pump_id' })
  pump?: Pump;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'nozzle_name', length: 100 })
  nozzleName: string;

  @Column({ name: 'nozzle_code', length: 50 })
  nozzleCode: string;

  @Column({ name: 'meter_capacity', type: 'numeric', precision: 14, scale: 3, default: 99999.999 })
  meterCapacity: string;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;
}

@Entity('pump_nozzle_assignments')
@Index(['tenantId', 'shiftSessionId', 'nozzleId'], { unique: true })
export class PumpNozzleAssignment extends TenantEntity {
  @Column({ name: 'shift_session_id', type: 'uuid' })
  shiftSessionId: string;

  @Column({ name: 'nozzle_id', type: 'uuid' })
  nozzleId: string;

  @Column({ name: 'pumper_id', type: 'uuid' })
  pumperId: string;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy?: string;
}

@Entity('pump_meter_readings')
@Index(['tenantId', 'shiftSessionId', 'nozzleId'], { unique: true })
export class PumpMeterReading extends TenantEntity {
  @Column({ name: 'shift_session_id', type: 'uuid' })
  shiftSessionId: string;

  @Column({ name: 'pump_id', type: 'uuid' })
  pumpId: string;

  @Column({ name: 'nozzle_id', type: 'uuid' })
  nozzleId: string;

  @Column({ name: 'fuel_product_id', type: 'uuid' })
  fuelProductId: string;

  @Column({ name: 'pumper_id', type: 'uuid', nullable: true })
  pumperId?: string;

  @Column({ name: 'opening_reading', type: 'numeric', precision: 14, scale: 3 })
  openingReading: string;

  @Column({ name: 'closing_reading', type: 'numeric', precision: 14, scale: 3, nullable: true })
  closingReading?: string;

  @Column({ name: 'is_rollover', default: false })
  isRollover: boolean;

  @Column({ name: 'dispensed_litres', type: 'numeric', precision: 14, scale: 3, nullable: true })
  dispensedLitres?: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  unitPrice?: string;

  @Column({ name: 'expected_cash', type: 'numeric', precision: 12, scale: 2, nullable: true })
  expectedCash?: string;

  @Column({ length: 30, default: 'OPEN' })
  status: string;

  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedBy?: string;
}

@Entity('pumper_cash_submissions')
@Index(['tenantId', 'shiftSessionId', 'pumperId'], { unique: true })
export class PumperCashSubmission extends TenantEntity {
  @Column({ name: 'shift_session_id', type: 'uuid' })
  shiftSessionId: string;

  @Column({ name: 'pumper_id', type: 'uuid' })
  pumperId: string;

  @Column({ name: 'expected_cash', type: 'numeric', precision: 12, scale: 2, default: 0 })
  expectedCash: string;

  @Column({ name: 'actual_cash', type: 'numeric', precision: 12, scale: 2, default: 0 })
  actualCash: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  variance: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  shortfall: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  excess: string;

  @Column({ length: 30, default: 'SUBMITTED' })
  status: string;
}

@Entity('salary_deductions')
@Index(['tenantId', 'status'])
export class SalaryDeduction extends TenantEntity {
  @Column({ name: 'staff_id', type: 'uuid' })
  staffId: string;

  @Column({ name: 'shift_session_id', type: 'uuid', nullable: true })
  shiftSessionId?: string;

  @Column({ name: 'payroll_run_id', type: 'uuid', nullable: true })
  payrollRunId?: string;

  @Column({ name: 'source_type', length: 50 })
  sourceType: string;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId?: string;

  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ length: 30, default: 'PENDING_APPROVAL' })
  status: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}

@Entity('stock_balances')
@Index(['tenantId', 'productId'], { unique: true })
export class StockBalance extends TenantEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'quantity_on_hand', type: 'numeric', precision: 14, scale: 3, default: 0 })
  quantityOnHand: string;
}

@Entity('stock_movements')
@Index(['tenantId', 'createdAt'])
export class StockMovement extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'movement_type', length: 50 })
  movementType: string;

  @Column({ name: 'reference_type', length: 50, nullable: true })
  referenceType?: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string;

  @Column({ name: 'quantity_in', type: 'numeric', precision: 14, scale: 3, default: 0 })
  quantityIn: string;

  @Column({ name: 'quantity_out', type: 'numeric', precision: 14, scale: 3, default: 0 })
  quantityOut: string;

  @Column({ name: 'balance_after', type: 'numeric', precision: 14, scale: 3 })
  balanceAfter: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('fuel_tanks')
@Index(['tenantId', 'tankCode'], { unique: true })
export class FuelTank extends TenantEntity {
  @Column({ name: 'tank_code', length: 50 })
  tankCode: string;

  @Column({ name: 'fuel_product_id', type: 'uuid' })
  fuelProductId: string;

  @Column({ name: 'capacity_litres', type: 'numeric', precision: 14, scale: 3 })
  capacityLitres: string;

  @Column({ name: 'current_stock_litres', type: 'numeric', precision: 14, scale: 3, default: 0 })
  currentStockLitres: string;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;
}

@Entity('bowser_receipts')
@Index(['tenantId', 'receiptNo'], { unique: true })
export class BowserReceipt extends TenantEntity {
  @Column({ name: 'receipt_no', length: 100 })
  receiptNo: string;

  @Column({ name: 'supplier_name', length: 150, nullable: true })
  supplierName?: string;

  @Column({ name: 'vehicle_no', length: 50, nullable: true })
  vehicleNo?: string;

  @Column({ name: 'driver_name', length: 150, nullable: true })
  driverName?: string;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate: string;

  @Column({ name: 'received_by', type: 'uuid', nullable: true })
  receivedBy?: string;

  @Column({ name: 'stock_order_id', type: 'uuid', nullable: true })
  stockOrderId?: string;

  @Column({ length: 30, default: 'DRAFT' })
  status: string;
}

@Entity('bowser_receipt_lines')
export class BowserReceiptLine extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'bowser_receipt_id', type: 'uuid' })
  bowserReceiptId: string;

  @Column({ name: 'tank_id', type: 'uuid' })
  tankId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'received_litres', type: 'numeric', precision: 14, scale: 3 })
  receivedLitres: string;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 12, scale: 2, default: 0 })
  unitCost: string;

  @Column({ name: 'total_cost', type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalCost: string;
}

@Entity('stock_orders')
@Index(['tenantId', 'orderNo'], { unique: true })
export class StockOrder extends TenantEntity {
  @Column({ name: 'order_no', length: 100 })
  orderNo: string;

  @Column({ name: 'supplier_name', length: 150, nullable: true })
  supplierName?: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: string;

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate?: string;

  @Column({ length: 30, default: 'DRAFT' })
  status: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;
}

@Entity('stock_order_items')
export class StockOrderItem extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'stock_order_id', type: 'uuid' })
  stockOrderId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'ordered_quantity', type: 'numeric', precision: 14, scale: 3 })
  orderedQuantity: string;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 12, scale: 2, default: 0 })
  unitCost: string;

  @Column({ name: 'total_cost', type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalCost: string;
}

@Entity('supplier_payments')
export class SupplierPayment extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'stock_order_id', type: 'uuid', nullable: true })
  stockOrderId?: string;

  @Column({ name: 'payment_type', length: 50 })
  paymentType: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  @Column({ name: 'reference_no', length: 100, nullable: true })
  referenceNo?: string;

  @Column({ length: 30, default: 'RECORDED' })
  status: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('credit_customers')
export class CreditCustomer extends TenantEntity {
  @Column({ name: 'customer_name', length: 150 })
  customerName: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'credit_limit', type: 'numeric', precision: 12, scale: 2, default: 0 })
  creditLimit: string;

  @Column({ name: 'outstanding_balance', type: 'numeric', precision: 12, scale: 2, default: 0 })
  outstandingBalance: string;

  @Column({ length: 30, default: 'ACTIVE' })
  status: string;
}

@Entity('credit_sales')
@Index(['tenantId', 'dueDate'])
export class CreditSale extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'shift_session_id', type: 'uuid', nullable: true })
  shiftSessionId?: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'numeric', precision: 14, scale: 3 })
  quantity: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2 })
  unitPrice: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2 })
  totalAmount: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string;

  @Column({ length: 30, default: 'OUTSTANDING' })
  status: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}

@Entity('due_collections')
export class DueCollection extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @Column({ name: 'credit_sale_id', type: 'uuid', nullable: true })
  creditSaleId?: string;

  @Column({ name: 'amount_collected', type: 'numeric', precision: 12, scale: 2 })
  amountCollected: string;

  @Column({ name: 'collection_date', type: 'date' })
  collectionDate: string;

  @Column({ name: 'payment_method', length: 50 })
  paymentMethod: string;

  @Column({ name: 'received_by', type: 'uuid', nullable: true })
  receivedBy?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}

@Entity('cheque_registry')
@Index(['tenantId', 'status'])
export class ChequeRegistry extends TenantEntity {
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ name: 'cheque_no', length: 100 })
  chequeNo: string;

  @Column({ name: 'bank_name', length: 150, nullable: true })
  bankName?: string;

  @Column({ name: 'branch_name', length: 150, nullable: true })
  branchName?: string;

  @Column({ name: 'cheque_date', type: 'date', nullable: true })
  chequeDate?: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate: string;

  @Column({ name: 'deposit_date', type: 'date', nullable: true })
  depositDate?: string;

  @Column({ length: 30, default: 'RECEIVED' })
  status: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}

@Entity('daily_cash_balances')
@Index(['tenantId', 'businessDate'], { unique: true })
export class DailyCashBalance extends TenantEntity {
  @Column({ name: 'business_date', type: 'date' })
  businessDate: string;

  @Column({ name: 'opening_cash', type: 'numeric', precision: 12, scale: 2, default: 0 })
  openingCash: string;

  @Column({ name: 'expected_cash', type: 'numeric', precision: 12, scale: 2, default: 0 })
  expectedCash: string;

  @Column({ name: 'actual_cash', type: 'numeric', precision: 12, scale: 2, default: 0 })
  actualCash: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  shortfall: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  excess: string;

  @Column({ name: 'bank_deposit', type: 'numeric', precision: 12, scale: 2, default: 0 })
  bankDeposit: string;

  @Column({ name: 'closing_cash', type: 'numeric', precision: 12, scale: 2, default: 0 })
  closingCash: string;

  @Column({ length: 30, default: 'PENDING' })
  status: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}

@Entity('payroll_runs')
export class PayrollRun extends TenantEntity {
  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({ length: 30, default: 'DRAFT' })
  status: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'finalized_by', type: 'uuid', nullable: true })
  finalizedBy?: string;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt?: Date;
}

@Entity('payroll_run_lines')
export class PayrollRunLine extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'payroll_run_id', type: 'uuid' })
  payrollRunId: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  staffId: string;

  @Column({ name: 'shift_count', type: 'int', default: 0 })
  shiftCount: number;

  @Column({ name: 'gross_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  grossAmount: string;

  @Column({ name: 'deduction_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  deductionAmount: string;

  @Column({ name: 'net_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  netAmount: string;
}

@Entity('cpc_stock_reports')
@Index(['tenantId', 'reportDate'])
export class CpcStockReport extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'report_date', type: 'date' })
  reportDate: string;

  @Column({ name: 'report_type', length: 50 })
  reportType: string;

  @Column({ name: 'generated_by', type: 'uuid', nullable: true })
  generatedBy?: string;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date;

  @Column({ length: 30, default: 'GENERATED' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('cpc_stock_report_lines')
export class CpcStockReportLine extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'opening_stock', type: 'numeric', precision: 14, scale: 3, default: 0 })
  openingStock: string;

  @Column({ name: 'received_stock', type: 'numeric', precision: 14, scale: 3, default: 0 })
  receivedStock: string;

  @Column({ name: 'sold_quantity', type: 'numeric', precision: 14, scale: 3, default: 0 })
  soldQuantity: string;

  @Column({ name: 'closing_stock', type: 'numeric', precision: 14, scale: 3, default: 0 })
  closingStock: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;
}

@Entity('audit_logs')
export class AuditLog extends UuidEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId?: string;

  @Column({ name: 'module_name', length: 100 })
  moduleName: string;

  @Column({ length: 100 })
  action: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue?: unknown;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue?: unknown;

  @Column({ name: 'ip_address', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('portal_user_refresh_tokens')
@Index(['userId'])
export class PortalUserRefreshToken extends UuidEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'token_hash', type: 'text' })
  tokenHash: string;

  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('geo_provinces')
export class GeoProvince {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('geo_districts')
@Index(['provinceId', 'name'], { unique: true })
export class GeoDistrict {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Index()
  @Column({ name: 'province_id', type: 'int' })
  provinceId: number;

  @ManyToOne(() => GeoProvince)
  @JoinColumn({ name: 'province_id' })
  province?: GeoProvince;

  @Column({ length: 100 })
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('geo_cities')
@Index(['districtId', 'name'])
export class GeoCity {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Index()
  @Column({ name: 'district_id', type: 'int' })
  districtId: number;

  @Index()
  @Column({ name: 'province_id', type: 'int' })
  provinceId: number;

  @ManyToOne(() => GeoDistrict)
  @JoinColumn({ name: 'district_id' })
  district?: GeoDistrict;

  @ManyToOne(() => GeoProvince)
  @JoinColumn({ name: 'province_id' })
  province?: GeoProvince;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'sub_name', length: 100, nullable: true })
  subName?: string;

  @Column({ name: 'postal_code', length: 30, nullable: true })
  postalCode?: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude?: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('geo_custom_cities')
@Index(['districtId', 'normalizedName'], { unique: true })
export class GeoCustomCity extends UuidEntity {
  @Index()
  @Column({ name: 'district_id', type: 'int' })
  districtId: number;

  @Index()
  @Column({ name: 'province_id', type: 'int' })
  provinceId: number;

  @ManyToOne(() => GeoDistrict)
  @JoinColumn({ name: 'district_id' })
  district?: GeoDistrict;

  @ManyToOne(() => GeoProvince)
  @JoinColumn({ name: 'province_id' })
  province?: GeoProvince;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'normalized_name', length: 100 })
  normalizedName: string;

  @Column({ name: 'postal_code', length: 30, nullable: true })
  postalCode?: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude?: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude?: string;

  @Column({ name: 'created_by_tenant_id', type: 'uuid', nullable: true })
  createdByTenantId?: string;

  @Column({ length: 30, default: 'PENDING_REVIEW' })
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('tenant_registration_attempts')
@Index(['stationCode'])
@Index(['ownerEmail'])
export class TenantRegistrationAttempt extends UuidEntity {
  @Column({ name: 'station_code', length: 50 })
  stationCode: string;

  @Column({ name: 'station_name', length: 150 })
  stationName: string;

  @Column({ name: 'owner_name', length: 150 })
  ownerName: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ length: 100, default: 'Sri Lanka' })
  country: string;

  @Column({ name: 'address_line1', length: 150 })
  addressLine1: string;

  @Column({ name: 'address_line2', length: 150, nullable: true })
  addressLine2?: string;

  @Column({ name: 'province_id', type: 'int' })
  provinceId: number;

  @Column({ name: 'district_id', type: 'int' })
  districtId: number;

  @Column({ name: 'geo_city_id', type: 'int', nullable: true })
  geoCityId?: number;

  @Column({ name: 'custom_city_name', length: 100, nullable: true })
  customCityName?: string;

  @Column({ name: 'postal_code', length: 30, nullable: true })
  postalCode?: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  latitude?: string;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  longitude?: string;

  @Column({ name: 'owner_email', length: 150 })
  ownerEmail: string;

  @Column({ name: 'owner_password_hash', type: 'text' })
  ownerPasswordHash: string;

  @Column({ name: 'verification_code_hash', type: 'text' })
  verificationCodeHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'last_sent_at', type: 'timestamptz' })
  lastSentAt: Date;

  @Column({ length: 30, default: 'PENDING' })
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('entity_change_logs')
@Index(['entityType', 'entityId'])
@Index(['tenantId', 'createdAt'])
export class EntityChangeLog extends UuidEntity {
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId?: string;

  @Column({ name: 'entity_type', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId: string;

  @Column({ length: 20 })
  action: string;

  @Column({ name: 'changed_fields', type: 'jsonb', nullable: true })
  changedFields?: unknown;

  @Column({ name: 'ip_address', length: 100, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('shift_correction_requests')
@Index(['tenantId'])
export class ShiftCorrectionRequest extends TenantEntity {
  @Column({ name: 'shift_session_id', type: 'uuid' })
  shiftSessionId: string;

  @Column({ name: 'correction_type', length: 50 })
  correctionType: string;

  @Column({ name: 'field_name', length: 100 })
  fieldName: string;

  @Column({ name: 'old_value', type: 'jsonb' })
  oldValue: unknown;

  @Column({ name: 'new_value', type: 'jsonb' })
  newValue: unknown;

  @Column({ type: 'text' })
  reason: string;

  @Column({ length: 30, default: 'PENDING' })
  status: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;
}

export const entities = [
  Tenant,
  TenantSetting,
  PortalUser,
  PortalUserRefreshToken,
  OperationalRole,
  StaffProfile,
  MeasurementUnit,
  Product,
  ProductPrice,
  ShiftTemplate,
  ShiftSession,
  StaffShiftAttendance,
  Pump,
  PumpNozzle,
  PumpNozzleAssignment,
  PumpMeterReading,
  PumperCashSubmission,
  SalaryDeduction,
  StockBalance,
  StockMovement,
  FuelTank,
  BowserReceipt,
  BowserReceiptLine,
  StockOrder,
  StockOrderItem,
  SupplierPayment,
  CreditCustomer,
  CreditSale,
  DueCollection,
  ChequeRegistry,
  DailyCashBalance,
  PayrollRun,
  PayrollRunLine,
  CpcStockReport,
  CpcStockReportLine,
  AuditLog,
  EntityChangeLog,
  ShiftCorrectionRequest,
  GeoProvince,
  GeoDistrict,
  GeoCity,
  GeoCustomCity,
  TenantRegistrationAttempt,
];
