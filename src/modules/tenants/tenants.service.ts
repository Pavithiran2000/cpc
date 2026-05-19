import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import {
  MeasurementUnit,
  OperationalRole,
  PortalUser,
  Product,
  StockBalance,
  Tenant,
  TenantSetting,
} from '../../database/entities';
import { PortalRole } from '../../common/enums/portal-role.enum';
import { AuditService } from '../audit/audit.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const defaultSettings: Record<string, string> = {
  salary_deduction_enabled: 'true',
  cash_shortfall_requires_approval: 'true',
  night_shift_enabled: 'false',
  night_stock_verification_required: 'true',
  allow_shift_overlap: 'false',
  currency: 'LKR',
  timezone: 'Asia/Colombo',
  cpc_report_format: 'DEFAULT',
};

const defaultRoles = [
  { name: 'Manager', requiresAttendance: true, liableForCashShortfall: false },
  { name: 'Pumper', requiresAttendance: true, liableForCashShortfall: true },
  { name: 'Accountant', requiresAttendance: false, liableForCashShortfall: false },
];

const defaultProducts = [
  ['PETROL', 'Petrol', 'FUEL', 'LITRE'],
  ['DIESEL', 'Diesel', 'FUEL', 'LITRE'],
  ['KEROSENE', 'Kerosene', 'FUEL', 'LITRE'],
  ['GAS-CYL', 'Gas Cylinder', 'GAS', 'UNIT'],
  ['OB-OIL', 'OB Oil', 'LUBRICANT', 'UNIT'],
  ['2T-OIL', '2T Oil', 'LUBRICANT', 'UNIT'],
  ['40-OIL', '40 Oil', 'LUBRICANT', 'UNIT'],
  ['90-OIL', '90 Oil', 'LUBRICANT', 'UNIT'],
  ['DELAGOLD-OIL', 'Delagold Oil', 'LUBRICANT', 'UNIT'],
  ['140-OIL', '140 Oil', 'LUBRICANT', 'UNIT'],
] as const;

@Injectable()
export class TenantsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(TenantSetting) private readonly settings: Repository<TenantSetting>,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTenantDto, actorUserId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const tenant = await manager.save(
        manager.create(Tenant, {
          stationCode: dto.station_code,
          stationName: dto.station_name,
          ownerName: dto.owner_name,
          address: dto.address,
          district: dto.district,
          contactNumber: dto.contact_number,
          email: dto.email?.toLowerCase(),
        }),
      );

      await manager.save(
        Object.entries(defaultSettings).map(([settingKey, settingValue]) =>
          manager.create(TenantSetting, { tenantId: tenant.id, settingKey, settingValue }),
        ),
      );

      await manager.save(
        defaultRoles.map((role) =>
          manager.create(OperationalRole, {
            tenantId: tenant.id,
            name: role.name,
            requiresAttendance: role.requiresAttendance,
            liableForCashShortfall: role.liableForCashShortfall,
          }),
        ),
      );

      const units = await manager.getRepository(MeasurementUnit).find();
      const unitByCode = new Map(units.map((unit) => [unit.code, unit]));
      const products = defaultProducts
        .filter(([, , , unitCode]) => unitByCode.has(unitCode))
        .map(([productCode, productName, category, unitCode]) =>
          manager.create(Product, {
            tenantId: tenant.id,
            productCode,
            productName,
            category,
            measurementUnitId: unitByCode.get(unitCode)!.id,
            isFuel: category === 'FUEL',
            isGas: category === 'GAS',
            isLubricant: category === 'LUBRICANT',
          }),
        );
      const savedProducts = await manager.save(products);
      await manager.save(savedProducts.map((product) => manager.create(StockBalance, { tenantId: tenant.id, productId: product.id })));

      if (dto.owner_email && dto.owner_password) {
        await manager.save(
          manager.create(PortalUser, {
            tenantId: tenant.id,
            name: dto.owner_name ?? dto.station_name,
            email: dto.owner_email.toLowerCase(),
            passwordHash: await bcrypt.hash(dto.owner_password, 12),
            portalRole: PortalRole.Owner,
          }),
        );
      }

      await this.audit.record(
        { tenantId: tenant.id, actorUserId, moduleName: 'tenants', action: 'CREATE', newValue: tenant },
        manager,
      );
      return tenant;
    });
  }

  findAll(query: ListQueryDto) {
    const qb = this.tenants.createQueryBuilder('tenant');
    return executeListQuery(qb, query, {
      alias: 'tenant',
      searchColumns: ['tenant.stationCode', 'tenant.stationName', 'tenant.ownerName', 'tenant.district', 'tenant.email'],
      statusColumn: 'tenant.status',
      dateColumn: 'tenant.createdAt',
      sortColumns: {
        station_code: 'tenant.stationCode',
        station_name: 'tenant.stationName',
        owner_name: 'tenant.ownerName',
        district: 'tenant.district',
        status: 'tenant.status',
        created_at: 'tenant.createdAt',
      },
      defaultSort: 'tenant.createdAt',
    });
  }

  async findOne(id: string) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async getSettings(id: string) {
    await this.findOne(id);
    const rows = await this.settings.find({ where: { tenantId: id } });
    return rows.reduce<Record<string, string | null>>(
      (settings, row) => ({
        ...settings,
        [row.settingKey]: row.settingValue ?? null,
      }),
      { ...defaultSettings },
    );
  }

  async update(id: string, dto: UpdateTenantDto, actorUserId?: string) {
    const tenant = await this.findOne(id);
    Object.assign(tenant, {
      stationCode: dto.station_code ?? tenant.stationCode,
      stationName: dto.station_name ?? tenant.stationName,
      ownerName: dto.owner_name ?? tenant.ownerName,
      address: dto.address ?? tenant.address,
      district: dto.district ?? tenant.district,
      contactNumber: dto.contact_number ?? tenant.contactNumber,
      email: dto.email?.toLowerCase() ?? tenant.email,
    });
    const saved = await this.tenants.save(tenant);
    await this.audit.record({ tenantId: id, actorUserId, moduleName: 'tenants', action: 'UPDATE', newValue: saved });
    return saved;
  }

  async updateSettings(id: string, settings: Record<string, string | boolean | number | null>, actorUserId?: string) {
    await this.findOne(id);
    const saved: TenantSetting[] = [];
    for (const [settingKey, rawValue] of Object.entries(settings)) {
      const settingValue = rawValue === null ? null : String(rawValue);
      const existing = await this.settings.findOne({ where: { tenantId: id, settingKey } });
      saved.push(await this.settings.save(this.settings.create({ ...existing, tenantId: id, settingKey, settingValue: settingValue ?? undefined })));
    }
    await this.audit.record({ tenantId: id, actorUserId, moduleName: 'tenant_settings', action: 'UPSERT', newValue: settings });
    return saved;
  }
}
