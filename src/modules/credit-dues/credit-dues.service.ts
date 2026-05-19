import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { money, quantity, toDecimal } from '../../common/utils/calculations';
import { CreditCustomer, CreditSale, DailyCashBalance, DueCollection, Product, StockBalance, StockMovement } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateCreditCustomerDto, CreateCreditSaleDto, CreateDueCollectionDto } from './dto/credit-dues.dto';

@Injectable()
export class CreditDuesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CreditCustomer) private readonly customers: Repository<CreditCustomer>,
    @InjectRepository(CreditSale) private readonly sales: Repository<CreditSale>,
    @InjectRepository(DueCollection) private readonly collections: Repository<DueCollection>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly audit: AuditService,
  ) {}

  createCustomer(tenantId: string, dto: CreateCreditCustomerDto) {
    return this.customers.save(
      this.customers.create({
        tenantId,
        customerName: dto.customer_name,
        phone: dto.phone,
        address: dto.address,
        creditLimit: money(dto.credit_limit ?? 0),
      }),
    );
  }

  listCustomers(tenantId: string, query: ListQueryDto) {
    const qb = this.customers.createQueryBuilder('customer').where('customer.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'customer',
      searchColumns: ['customer.customerName', 'customer.phone', 'customer.address'],
      statusColumn: 'customer.status',
      dateColumn: 'customer.createdAt',
      sortColumns: {
        customer_name: 'customer.customerName',
        outstanding_balance: 'customer.outstandingBalance',
        credit_limit: 'customer.creditLimit',
        status: 'customer.status',
        created_at: 'customer.createdAt',
      },
      defaultSort: 'customer.customerName',
    });
  }

  listSales(tenantId: string, query: ListQueryDto) {
    const qb = this.sales.createQueryBuilder('sale').where('sale.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'sale',
      statusColumn: 'sale.status',
      dateColumn: 'sale.createdAt',
      sortColumns: {
        created_at: 'sale.createdAt',
        due_date: 'sale.dueDate',
        total_amount: 'sale.totalAmount',
        status: 'sale.status',
      },
      defaultSort: 'sale.createdAt',
    });
  }

  listCollections(tenantId: string, query: ListQueryDto) {
    const qb = this.collections.createQueryBuilder('collection').where('collection.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'collection',
      searchColumns: ['collection.paymentMethod'],
      dateColumn: 'collection.collectionDate',
      sortColumns: {
        collection_date: 'collection.collectionDate',
        amount_collected: 'collection.amountCollected',
        payment_method: 'collection.paymentMethod',
        created_at: 'collection.createdAt',
      },
      defaultSort: 'collection.createdAt',
    });
  }

  async createCreditSale(tenantId: string, dto: CreateCreditSaleDto, actorUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(CreditCustomer, { where: { tenantId, id: dto.customer_id } });
      if (!customer) throw new NotFoundException('Credit customer not found');

      // Load product to check category
      const product = await manager.findOne(Product, { where: { tenantId, id: dto.product_id } });
      if (!product) throw new NotFoundException('Product not found');

      const total = dto.quantity * dto.unit_price;
      const nextOutstanding = toDecimal(customer.outstandingBalance) + total;
      if (toDecimal(customer.creditLimit) > 0 && nextOutstanding > toDecimal(customer.creditLimit)) {
        throw new BadRequestException('Credit limit exceeded');
      }
      const sale = await manager.save(
        manager.create(CreditSale, {
          tenantId,
          shiftSessionId: dto.shift_session_id,
          customerId: dto.customer_id,
          productId: dto.product_id,
          quantity: quantity(dto.quantity),
          unitPrice: money(dto.unit_price),
          totalAmount: money(total),
          dueDate: dto.due_date,
          createdBy: actorUserId,
        }),
      );

      // RULE §5.11: Only deduct stock for GAS and LUBRICANT. Fuel stock is deducted at shift close via meter readings.
      if (product.category !== 'FUEL') {
        let balance = await manager.findOne(StockBalance, { where: { tenantId, productId: dto.product_id } });
        balance ??= manager.create(StockBalance, { tenantId, productId: dto.product_id, quantityOnHand: '0' });
        const nextStock = toDecimal(balance.quantityOnHand) - dto.quantity;
        if (nextStock < 0) throw new BadRequestException('Stock balance cannot be negative');
        balance.quantityOnHand = quantity(nextStock);
        await manager.save(balance);
        await manager.save(
          manager.create(StockMovement, {
            tenantId,
            productId: dto.product_id,
            movementType: 'CREDIT_SALE',
            referenceType: 'CREDIT_SALE',
            referenceId: sale.id,
            quantityIn: '0',
            quantityOut: quantity(dto.quantity),
            balanceAfter: balance.quantityOnHand,
            createdBy: actorUserId,
          }),
        );
      }

      customer.outstandingBalance = money(nextOutstanding);
      await manager.save(customer);
      await this.audit.record({ tenantId, actorUserId, moduleName: 'credit_sales', action: 'CREATE', newValue: sale }, manager);
      return sale;
    });
  }

  async createDueCollection(tenantId: string, dto: CreateDueCollectionDto, actorUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const customer = await manager.findOne(CreditCustomer, { where: { tenantId, id: dto.customer_id } });
      if (!customer) throw new NotFoundException('Credit customer not found');
      const collection = await manager.save(
        manager.create(DueCollection, {
          tenantId,
          customerId: dto.customer_id,
          creditSaleId: dto.credit_sale_id,
          amountCollected: money(dto.amount_collected),
          collectionDate: dto.collection_date,
          paymentMethod: dto.payment_method,
          receivedBy: actorUserId,
        }),
      );
      customer.outstandingBalance = money(Math.max(0, toDecimal(customer.outstandingBalance) - dto.amount_collected));
      await manager.save(customer);

      if (dto.credit_sale_id) {
        const sale = await manager.findOne(CreditSale, { where: { tenantId, id: dto.credit_sale_id } });
        if (sale && dto.amount_collected >= toDecimal(sale.totalAmount)) {
          sale.status = 'PAID';
          await manager.save(sale);
        }
      }

      if (dto.payment_method.toUpperCase() === 'CASH') {
        let balance = await manager.findOne(DailyCashBalance, { where: { tenantId, businessDate: dto.collection_date } });
        balance ??= manager.create(DailyCashBalance, { tenantId, businessDate: dto.collection_date });
        balance.actualCash = money(toDecimal(balance.actualCash) + dto.amount_collected);
        balance.closingCash = money(toDecimal(balance.closingCash) + dto.amount_collected);
        await manager.save(balance);
      }

      await this.audit.record({ tenantId, actorUserId, moduleName: 'due_collections', action: 'CREATE', newValue: collection }, manager);
      return collection;
    });
  }
}
