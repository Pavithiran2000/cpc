import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { Product, Pump, PumpNozzle } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreatePumpDto, CreateStandaloneNozzleDto, UpdatePumpDto } from './dto/create-pump.dto';

@Injectable()
export class PumpsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Pump) private readonly pumps: Repository<Pump>,
    @InjectRepository(PumpNozzle) private readonly nozzles: Repository<PumpNozzle>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto) {
    const qb = this.pumps
      .createQueryBuilder('pump')
      .leftJoinAndSelect('pump.nozzles', 'nozzle')
      .where('pump.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'pump',
      searchColumns: ['pump.pumpCode', 'pump.pumpName', 'nozzle.nozzleCode', 'nozzle.nozzleName'],
      statusColumn: 'pump.status',
      dateColumn: 'pump.createdAt',
      sortColumns: {
        pump_code: 'pump.pumpCode',
        pump_name: 'pump.pumpName',
        status: 'pump.status',
        created_at: 'pump.createdAt',
      },
      defaultSort: 'pump.pumpCode',
      defaultSortOrder: 'ASC',
    });
  }

  async create(tenantId: string, dto: CreatePumpDto, actorUserId: string) {
    if (!dto.nozzles?.length) {
      throw new BadRequestException('Pump must have at least one nozzle');
    }
    await this.ensureFuelProducts(tenantId, dto.nozzles.map((nozzle) => nozzle.product_id));
    return this.dataSource.transaction(async (manager) => {
      const pump = await manager.save(manager.create(Pump, { tenantId, pumpCode: dto.pump_code, pumpName: dto.pump_name }));
      await manager.save(
        dto.nozzles.map((nozzle) =>
          manager.create(PumpNozzle, {
            tenantId,
            pumpId: pump.id,
            productId: nozzle.product_id,
            nozzleName: nozzle.nozzle_name,
            nozzleCode: nozzle.nozzle_code,
          }),
        ),
      );
      await this.audit.record({ tenantId, actorUserId, moduleName: 'pumps', action: 'CREATE_WITH_NOZZLES', newValue: pump }, manager);
      return manager.findOne(Pump, { where: { tenantId, id: pump.id }, relations: { nozzles: true } });
    });
  }

  async update(tenantId: string, id: string, dto: UpdatePumpDto, actorUserId: string) {
    const pump = await this.pumps.findOne({ where: { tenantId, id } });
    if (!pump) throw new NotFoundException('Pump not found');
    pump.pumpName = dto.pump_name ?? pump.pumpName;
    pump.status = dto.status ?? pump.status;
    const saved = await this.pumps.save(pump);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'pumps', action: 'UPDATE', newValue: saved });
    return saved;
  }

  listNozzles(tenantId: string, query: ListQueryDto) {
    const qb = this.nozzles.createQueryBuilder('nozzle').where('nozzle.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'nozzle',
      searchColumns: ['nozzle.nozzleCode', 'nozzle.nozzleName'],
      statusColumn: 'nozzle.status',
      dateColumn: 'nozzle.createdAt',
      sortColumns: {
        nozzle_code: 'nozzle.nozzleCode',
        nozzle_name: 'nozzle.nozzleName',
        status: 'nozzle.status',
        created_at: 'nozzle.createdAt',
      },
      defaultSort: 'nozzle.nozzleCode',
      defaultSortOrder: 'ASC',
    });
  }

  async createNozzle(tenantId: string, dto: CreateStandaloneNozzleDto, actorUserId: string) {
    const pump = await this.pumps.findOne({ where: { tenantId, id: dto.pump_id } });
    if (!pump) throw new NotFoundException('Pump not found');
    await this.ensureFuelProducts(tenantId, [dto.product_id]);
    const nozzle = await this.nozzles.save(
      this.nozzles.create({
        tenantId,
        pumpId: dto.pump_id,
        productId: dto.product_id,
        nozzleName: dto.nozzle_name,
        nozzleCode: dto.nozzle_code,
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'pump_nozzles', action: 'CREATE', newValue: nozzle });
    return nozzle;
  }

  async updateNozzle(tenantId: string, id: string, dto: Partial<CreateStandaloneNozzleDto>, actorUserId: string) {
    const nozzle = await this.nozzles.findOne({ where: { tenantId, id } });
    if (!nozzle) throw new NotFoundException('Nozzle not found');
    if (dto.product_id) await this.ensureFuelProducts(tenantId, [dto.product_id]);
    nozzle.nozzleName = dto.nozzle_name ?? nozzle.nozzleName;
    nozzle.nozzleCode = dto.nozzle_code ?? nozzle.nozzleCode;
    nozzle.productId = dto.product_id ?? nozzle.productId;
    const saved = await this.nozzles.save(nozzle);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'pump_nozzles', action: 'UPDATE', newValue: saved });
    return saved;
  }

  private async ensureFuelProducts(tenantId: string, productIds: string[]) {
    const uniqueIds = [...new Set(productIds)];
    const products = await this.products.find({ where: uniqueIds.map((id) => ({ tenantId, id, category: 'FUEL' as const, status: 'ACTIVE' })) });
    if (products.length !== uniqueIds.length) {
      throw new BadRequestException('Pump nozzle fuel product must be an active fuel product');
    }
  }
}
