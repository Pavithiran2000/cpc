import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { quantity, toDecimal } from '../../common/utils/calculations';
import { FuelTank, Product, StockBalance, StockMovement } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateFuelTankDto, NightVerificationDto, StockAdjustmentDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StockBalance) private readonly balances: Repository<StockBalance>,
    @InjectRepository(StockMovement) private readonly movements: Repository<StockMovement>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(FuelTank) private readonly tanks: Repository<FuelTank>,
    private readonly audit: AuditService,
  ) {}

  balancesForTenant(tenantId: string, query: ListQueryDto) {
    const qb = this.balances.createQueryBuilder('balance').where('balance.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'balance',
      dateColumn: 'balance.updatedAt',
      sortColumns: {
        quantity_on_hand: 'balance.quantityOnHand',
        updated_at: 'balance.updatedAt',
        created_at: 'balance.createdAt',
      },
      defaultSort: 'balance.updatedAt',
    });
  }

  movementsForTenant(tenantId: string, query: ListQueryDto) {
    const qb = this.movements.createQueryBuilder('movement').where('movement.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'movement',
      searchColumns: ['movement.movementType', 'movement.referenceType'],
      dateColumn: 'movement.createdAt',
      sortColumns: {
        movement_type: 'movement.movementType',
        created_at: 'movement.createdAt',
        quantity_in: 'movement.quantityIn',
        quantity_out: 'movement.quantityOut',
      },
      defaultSort: 'movement.createdAt',
    });
  }

  listTanks(tenantId: string, query: ListQueryDto) {
    const qb = this.tanks.createQueryBuilder('tank').where('tank.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'tank',
      searchColumns: ['tank.tankCode'],
      statusColumn: 'tank.status',
      dateColumn: 'tank.createdAt',
      sortColumns: {
        tank_code: 'tank.tankCode',
        capacity_litres: 'tank.capacityLitres',
        current_stock_litres: 'tank.currentStockLitres',
        status: 'tank.status',
      },
      defaultSort: 'tank.tankCode',
    });
  }

  async createTank(tenantId: string, dto: CreateFuelTankDto, actorUserId: string) {
    const product = await this.products.findOne({ where: { tenantId, id: dto.fuel_product_id, category: 'FUEL' } });
    if (!product) throw new NotFoundException('Fuel product not found');
    const tank = await this.tanks.save(
      this.tanks.create({
        tenantId,
        tankCode: dto.tank_code,
        fuelProductId: dto.fuel_product_id,
        capacityLitres: quantity(dto.capacity_litres),
        currentStockLitres: quantity(dto.current_stock_litres ?? 0),
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'fuel_tanks', action: 'CREATE', newValue: tank });
    return tank;
  }

  async adjust(tenantId: string, dto: StockAdjustmentDto, actorUserId: string) {
    if (!dto.reference_type || !dto.reference_id) {
      throw new BadRequestException('Stock movement references are required');
    }
    return this.dataSource.transaction(async (manager) => {
      const balance = await this.getOrCreateBalance(manager, tenantId, dto.product_id);
      const next = toDecimal(balance.quantityOnHand) + dto.quantity_in - dto.quantity_out;
      if (next < 0) throw new BadRequestException('Stock balance cannot be negative');
      balance.quantityOnHand = quantity(next);
      await manager.save(balance);
      const movement = await manager.save(
        manager.create(StockMovement, {
          tenantId,
          productId: dto.product_id,
          movementType: dto.movement_type,
          referenceType: dto.reference_type,
          referenceId: dto.reference_id,
          quantityIn: quantity(dto.quantity_in),
          quantityOut: quantity(dto.quantity_out),
          balanceAfter: balance.quantityOnHand,
          createdBy: actorUserId,
        }),
      );
      await this.audit.record({ tenantId, actorUserId, moduleName: 'inventory', action: 'ADJUST', newValue: movement }, manager);
      return movement;
    });
  }

  async nightVerification(tenantId: string, dto: NightVerificationDto, actorUserId: string) {
    const product = await this.products.findOne({ where: { tenantId, id: dto.product_id } });
    if (!product?.isLubricant) throw new NotFoundException('Lubricant product not found');
    const balance = await this.balances.findOne({ where: { tenantId, productId: dto.product_id } });
    const systemStock = toDecimal(balance?.quantityOnHand);
    const variance = dto.physical_stock - systemStock;
    return this.adjust(
      tenantId,
      {
        product_id: dto.product_id,
        movement_type: 'NIGHT_VERIFICATION',
        quantity_in: variance > 0 ? variance : 0,
        quantity_out: variance < 0 ? Math.abs(variance) : 0,
        reference_type: 'NIGHT_STOCK_VERIFICATION',
        reference_id: dto.product_id,
      },
      actorUserId,
    );
  }

  private async getOrCreateBalance(manager: DataSource['manager'], tenantId: string, productId: string) {
    const existing = await manager.findOne(StockBalance, { where: { tenantId, productId } });
    if (existing) return existing;
    return manager.create(StockBalance, { tenantId, productId, quantityOnHand: '0' });
  }
}
