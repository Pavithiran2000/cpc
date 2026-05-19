import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { quantity, toDecimal } from '../../common/utils/calculations';
import { BowserReceipt, BowserReceiptLine, FuelTank, StockBalance, StockMovement, StockOrder } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { ApproveBowserReceiptDto, CreateBowserReceiptDto } from './dto/bowser-receipt.dto';

@Injectable()
export class BowserReceiptsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BowserReceipt) private readonly receipts: Repository<BowserReceipt>,
    @InjectRepository(BowserReceiptLine) private readonly lines: Repository<BowserReceiptLine>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto) {
    const qb = this.receipts.createQueryBuilder('receipt').where('receipt.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'receipt',
      searchColumns: ['receipt.receiptNo', 'receipt.supplierName', 'receipt.vehicleNo', 'receipt.driverName'],
      statusColumn: 'receipt.status',
      dateColumn: 'receipt.receivedDate',
      sortColumns: {
        receipt_no: 'receipt.receiptNo',
        received_date: 'receipt.receivedDate',
        supplier_name: 'receipt.supplierName',
        status: 'receipt.status',
        created_at: 'receipt.createdAt',
      },
      defaultSort: 'receipt.receivedDate',
    });
  }

  async findOne(tenantId: string, id: string) {
    const receipt = await this.receipts.findOne({ where: { tenantId, id } });
    if (!receipt) throw new NotFoundException('Bowser receipt not found');
    const lines = await this.lines.find({ where: { tenantId, bowserReceiptId: id } });
    return { ...receipt, lines };
  }

  async create(tenantId: string, dto: CreateBowserReceiptDto, actorUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const receipt = await manager.save(
        manager.create(BowserReceipt, {
          tenantId,
          receiptNo: dto.receipt_no,
          supplierName: dto.supplier_name,
          vehicleNo: dto.vehicle_no,
          driverName: dto.driver_name,
          receivedDate: dto.received_date,
          receivedBy: actorUserId,
          stockOrderId: dto.stock_order_id,
        }),
      );
      await manager.save(
        dto.lines.map((line) =>
          manager.create(BowserReceiptLine, {
            tenantId,
            bowserReceiptId: receipt.id,
            tankId: line.tank_id,
            productId: line.product_id,
            receivedLitres: quantity(line.received_litres),
            unitCost: line.unit_cost.toFixed(2),
            totalCost: (line.received_litres * line.unit_cost).toFixed(2),
          }),
        ),
      );
      await this.audit.record({ tenantId, actorUserId, moduleName: 'bowser_receipts', action: 'CREATE', newValue: receipt }, manager);
      return receipt;
    });
  }

  async approve(tenantId: string, id: string, dto: ApproveBowserReceiptDto, actorUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const receipt = await manager.findOne(BowserReceipt, { where: { tenantId, id } });
      if (!receipt) throw new NotFoundException('Bowser receipt not found');
      if (receipt.status === 'APPROVED') throw new BadRequestException('Bowser receipt is already approved');

      if (dto.lines?.length) {
        await manager.delete(BowserReceiptLine, { tenantId, bowserReceiptId: id });
        await manager.save(
          dto.lines.map((line) =>
            manager.create(BowserReceiptLine, {
              tenantId,
              bowserReceiptId: id,
              tankId: line.tank_id,
              productId: line.product_id,
              receivedLitres: quantity(line.received_litres),
              unitCost: line.unit_cost.toFixed(2),
              totalCost: (line.received_litres * line.unit_cost).toFixed(2),
            }),
          ),
        );
      }

      const lines = await manager.find(BowserReceiptLine, { where: { tenantId, bowserReceiptId: id } });
      if (!lines.length || lines.some((line) => toDecimal(line.receivedLitres) <= 0)) {
        throw new BadRequestException('Cannot approve bowser receipt with zero received litres');
      }

      for (const line of lines) {
        const tank = await manager.findOne(FuelTank, { where: { tenantId, id: line.tankId } });
        if (!tank) throw new NotFoundException('Fuel tank not found');
        tank.currentStockLitres = quantity(toDecimal(tank.currentStockLitres) + toDecimal(line.receivedLitres));
        await manager.save(tank);

        let balance = await manager.findOne(StockBalance, { where: { tenantId, productId: line.productId } });
        balance ??= manager.create(StockBalance, { tenantId, productId: line.productId, quantityOnHand: '0' });
        balance.quantityOnHand = quantity(toDecimal(balance.quantityOnHand) + toDecimal(line.receivedLitres));
        await manager.save(balance);

        await manager.save(
          manager.create(StockMovement, {
            tenantId,
            productId: line.productId,
            movementType: 'BOWSER_RECEIPT',
            referenceType: 'BOWSER_RECEIPT',
            referenceId: id,
            quantityIn: line.receivedLitres,
            quantityOut: '0',
            balanceAfter: balance.quantityOnHand,
            createdBy: actorUserId,
          }),
        );
      }

      receipt.status = 'APPROVED';
      await manager.save(receipt);
      if (receipt.stockOrderId) {
        await manager.update(StockOrder, { tenantId, id: receipt.stockOrderId }, { status: 'PARTIALLY_RECEIVED' });
      }
      await this.audit.record({ tenantId, actorUserId, moduleName: 'bowser_receipts', action: 'APPROVE', newValue: { id } }, manager);
      return receipt;
    });
  }
}
