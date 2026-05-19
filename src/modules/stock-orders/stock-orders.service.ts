import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { StockOrder, StockOrderItem, SupplierPayment } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateStockOrderDto, SupplierPaymentDto } from './dto/stock-order.dto';

@Injectable()
export class StockOrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StockOrder) private readonly orders: Repository<StockOrder>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto) {
    const qb = this.orders.createQueryBuilder('order').where('order.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'order',
      searchColumns: ['order.orderNo', 'order.supplierName'],
      statusColumn: 'order.status',
      dateColumn: 'order.orderDate',
      sortColumns: {
        order_no: 'order.orderNo',
        supplier_name: 'order.supplierName',
        order_date: 'order.orderDate',
        expected_delivery_date: 'order.expectedDeliveryDate',
        status: 'order.status',
      },
      defaultSort: 'order.orderDate',
    });
  }

  async create(tenantId: string, dto: CreateStockOrderDto, actorUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.save(
        manager.create(StockOrder, {
          tenantId,
          orderNo: dto.order_no,
          supplierName: dto.supplier_name,
          orderDate: dto.order_date,
          expectedDeliveryDate: dto.expected_delivery_date,
          createdBy: actorUserId,
        }),
      );
      await manager.save(
        dto.items.map((item) =>
          manager.create(StockOrderItem, {
            tenantId,
            stockOrderId: order.id,
            productId: item.product_id,
            orderedQuantity: item.ordered_quantity.toFixed(3),
            unitCost: item.unit_cost.toFixed(2),
            totalCost: (item.ordered_quantity * item.unit_cost).toFixed(2),
          }),
        ),
      );
      await this.audit.record({ tenantId, actorUserId, moduleName: 'stock_orders', action: 'CREATE', newValue: order }, manager);
      return order;
    });
  }

  async approve(tenantId: string, id: string, actorUserId: string) {
    const order = await this.orders.findOne({ where: { tenantId, id } });
    if (!order) throw new NotFoundException('Stock order not found');
    order.status = 'APPROVED';
    order.approvedBy = actorUserId;
    const saved = await this.orders.save(order);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'stock_orders', action: 'APPROVE', newValue: { id } });
    return saved;
  }

  async createPayment(tenantId: string, dto: SupplierPaymentDto, actorUserId: string) {
    const payment = await this.dataSource.getRepository(SupplierPayment).save(
      this.dataSource.getRepository(SupplierPayment).create({
        tenantId,
        stockOrderId: dto.stock_order_id,
        paymentType: dto.payment_type,
        amount: dto.amount.toFixed(2),
        paymentDate: dto.payment_date,
        referenceNo: dto.reference_no,
        createdBy: actorUserId,
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'supplier_payments', action: 'CREATE', newValue: payment });
    return payment;
  }
}
