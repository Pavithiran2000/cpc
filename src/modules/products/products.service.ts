import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { MeasurementUnit, Product, ProductPrice, StockBalance } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreatePriceDto } from './dto/create-price.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductPrice) private readonly prices: Repository<ProductPrice>,
    @InjectRepository(MeasurementUnit) private readonly units: Repository<MeasurementUnit>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto) {
    const qb = this.products.createQueryBuilder('product').where('product.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'product',
      searchColumns: ['product.productCode', 'product.productName', 'product.category'],
      statusColumn: 'product.status',
      dateColumn: 'product.createdAt',
      sortColumns: {
        product_code: 'product.productCode',
        product_name: 'product.productName',
        category: 'product.category',
        status: 'product.status',
        created_at: 'product.createdAt',
      },
      defaultSort: 'product.productName',
      defaultSortOrder: 'ASC',
    });
  }

  async create(tenantId: string, dto: CreateProductDto, actorUserId: string) {
    const unit = await this.units.findOne({ where: { id: dto.measurement_unit_id } });
    if (!unit) throw new NotFoundException('Measurement unit not found');
    const product = await this.products.save(
      this.products.create({
        tenantId,
        productCode: dto.product_code,
        productName: dto.product_name,
        category: dto.category,
        measurementUnitId: dto.measurement_unit_id,
        isFuel: dto.is_fuel ?? dto.category === 'FUEL',
        isGas: dto.is_gas ?? dto.category === 'GAS',
        isLubricant: dto.is_lubricant ?? dto.category === 'LUBRICANT',
      }),
    );
    await this.dataSource.getRepository(StockBalance).save({ tenantId, productId: product.id, quantityOnHand: '0' });
    await this.audit.record({ tenantId, actorUserId, moduleName: 'products', action: 'CREATE', newValue: product });
    return product;
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto, actorUserId: string) {
    const product = await this.products.findOne({ where: { tenantId, id } });
    if (!product) throw new NotFoundException('Product not found');
    product.productName = dto.product_name ?? product.productName;
    product.status = dto.status ?? product.status;
    const saved = await this.products.save(product);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'products', action: 'UPDATE', newValue: saved });
    return saved;
  }

  listPrices(tenantId: string, productId: string, query: ListQueryDto) {
    const qb = this.prices
      .createQueryBuilder('price')
      .where('price.tenantId = :tenantId', { tenantId })
      .andWhere('price.productId = :productId', { productId });
    return executeListQuery(qb, query, {
      alias: 'price',
      statusColumn: 'price.status',
      dateColumn: 'price.effectiveFrom',
      sortColumns: {
        effective_from: 'price.effectiveFrom',
        selling_price: 'price.sellingPrice',
        cost_price: 'price.costPrice',
        status: 'price.status',
      },
      defaultSort: 'price.effectiveFrom',
    });
  }

  async createPrice(tenantId: string, productId: string, dto: CreatePriceDto, actorUserId: string) {
    const product = await this.products.findOne({ where: { tenantId, id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (dto.selling_price <= 0) throw new BadRequestException('Selling price must be greater than zero');

    return this.dataSource.transaction(async (manager) => {
      await manager.update(
        ProductPrice,
        { tenantId, productId, status: 'ACTIVE', effectiveTo: IsNull() },
        { status: 'INACTIVE', effectiveTo: new Date(dto.effective_from) },
      );
      const price = await manager.save(
        manager.create(ProductPrice, {
          tenantId,
          productId,
          sellingPrice: String(dto.selling_price),
          costPrice: String(dto.cost_price ?? 0),
          effectiveFrom: new Date(dto.effective_from),
          status: 'ACTIVE',
          createdBy: actorUserId,
        }),
      );
      await this.audit.record({ tenantId, actorUserId, moduleName: 'product_prices', action: 'UPDATE_PRICE', newValue: price }, manager);
      return price;
    });
  }
}
