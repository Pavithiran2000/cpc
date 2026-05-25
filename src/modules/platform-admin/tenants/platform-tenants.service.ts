import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditLog, PlatformActivityLog, PortalUser, Tenant, TenantSetting } from '../../../database/entities';
import { TenantsService } from '../../tenants/tenants.service';
import { paginated, sortDirection, safeSortBy } from '../../../common/dto';
import { PlatformCreateTenantDto } from './dto/platform-create-tenant.dto';
import { PlatformUpdateTenantDto } from './dto/platform-update-tenant.dto';

@Injectable()
export class PlatformTenantsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(TenantSetting) private readonly settings: Repository<TenantSetting>,
    @InjectRepository(PortalUser) private readonly portalUsers: Repository<PortalUser>,
    @InjectRepository(PlatformActivityLog) private readonly activityLogs: Repository<PlatformActivityLog>,
    private readonly tenantsService: TenantsService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    district?: string;
    sort_by?: string;
    sort_order?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const sortMap: Record<string, string> = {
      station_name: 'tenant.stationName',
      station_code: 'tenant.stationCode',
      created_at: 'tenant.createdAt',
      status: 'tenant.status',
      district: 'tenant.district',
    };
    const orderBy = safeSortBy(query.sort_by, sortMap, 'tenant.createdAt');
    const direction = (query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    const qb = this.tenants
      .createQueryBuilder('tenant')
      .addSelect(
        (sub) => sub.select('COUNT(*)', 'cnt').from('portal_users', 'pu').where('pu.tenant_id = tenant.id'),
        'portal_user_count',
      );

    if (query.status) {
      qb.andWhere('tenant.status = :status', { status: query.status });
    }

    if (query.district) {
      qb.andWhere('tenant.district = :district', { district: query.district });
    }

    if (query.search?.trim()) {
      const s = `%${query.search.trim().replace(/[%_]/g, '\\$&')}%`;
      qb.andWhere(
        '(tenant.stationName ILIKE :s OR tenant.stationCode ILIKE :s OR tenant.ownerName ILIKE :s OR tenant.email ILIKE :s)',
        { s },
      );
    }

    qb.orderBy(orderBy, direction).take(limit).skip(skip);

    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, { page, limit });
  }

  async findOne(id: string) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const settingsRows = await this.settings.find({ where: { tenantId: id } });
    const settings = settingsRows.reduce<Record<string, string | null>>(
      (acc, row) => ({ ...acc, [row.settingKey]: row.settingValue ?? null }),
      {},
    );
    const [portalUserCount, shiftCount, staffCount] = await Promise.all([
      this.dataSource.query<[{ count: string }]>('SELECT COUNT(*) as count FROM portal_users WHERE tenant_id = $1', [id]),
      this.dataSource.query<[{ count: string }]>('SELECT COUNT(*) as count FROM shift_sessions WHERE tenant_id = $1', [id]),
      this.dataSource.query<[{ count: string }]>('SELECT COUNT(*) as count FROM staff_profiles WHERE tenant_id = $1 AND deleted_at IS NULL', [id]),
    ]);
    return {
      ...tenant,
      settings,
      _counts: {
        portal_users: Number(portalUserCount[0]?.count ?? 0),
        shift_sessions: Number(shiftCount[0]?.count ?? 0),
        staff_profiles: Number(staffCount[0]?.count ?? 0),
      },
    };
  }

  async getTenantStats(id: string) {
    const exists = await this.tenants.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('Tenant not found');

    const [staff, shifts, products, activeSessions, lastActivity] = await Promise.all([
      this.dataSource.query<[{ count: string }]>(
        'SELECT COUNT(*) as count FROM staff_profiles WHERE tenant_id = $1 AND deleted_at IS NULL',
        [id],
      ),
      this.dataSource.query<[{ count: string }]>(
        'SELECT COUNT(*) as count FROM shift_sessions WHERE tenant_id = $1',
        [id],
      ),
      this.dataSource.query<[{ count: string }]>(
        'SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND status = $2',
        [id, 'ACTIVE'],
      ),
      this.dataSource.query<[{ count: string }]>(
        "SELECT COUNT(*) as count FROM shift_sessions WHERE tenant_id = $1 AND status = 'OPEN'",
        [id],
      ),
      this.dataSource.query<[{ opened_at: Date | null }]>(
        'SELECT opened_at FROM shift_sessions WHERE tenant_id = $1 ORDER BY opened_at DESC NULLS LAST LIMIT 1',
        [id],
      ),
    ]);

    return {
      total_staff: Number(staff[0]?.count ?? 0),
      total_shifts: Number(shifts[0]?.count ?? 0),
      total_products: Number(products[0]?.count ?? 0),
      active_sessions: Number(activeSessions[0]?.count ?? 0),
      last_activity: lastActivity[0]?.opened_at ?? null,
    };
  }

  async getTenantUsers(id: string, query: { page?: number; limit?: number }) {
    const exists = await this.tenants.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('Tenant not found');

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);

    const qb = this.portalUsers
      .createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.email', 'u.phone', 'u.portalRole', 'u.status', 'u.lastLoginAt', 'u.createdAt'])
      .where('u.tenantId = :id', { id })
      .orderBy('u.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, { page, limit });
  }

  async getTenantActivity(id: string, query: { page?: number; limit?: number }) {
    const exists = await this.tenants.findOne({ where: { id } });
    if (!exists) throw new NotFoundException('Tenant not found');

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);

    const qb = this.dataSource
      .getRepository(AuditLog)
      .createQueryBuilder('log')
      .where('log.tenantId = :id', { id })
      .orderBy('log.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, { page, limit });
  }

  async create(dto: PlatformCreateTenantDto, adminId: string, adminEmail: string) {
    const tenant = await this.tenantsService.create(dto);
    if (dto.status && dto.status !== 'ACTIVE') {
      await this.tenants.update(tenant.id, { status: dto.status });
      tenant.status = dto.status;
    }
    await this.logActivity(adminId, adminEmail, 'TENANT_CREATED', 'tenant', tenant.id, tenant.stationName);
    return tenant;
  }

  async update(id: string, dto: PlatformUpdateTenantDto, adminId: string, adminEmail: string) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    Object.assign(tenant, {
      stationName: dto.station_name ?? tenant.stationName,
      ownerName: dto.owner_name ?? tenant.ownerName,
      address: dto.address ?? tenant.address,
      district: dto.district ?? tenant.district,
      contactNumber: dto.contact_number ?? tenant.contactNumber,
      email: dto.email?.toLowerCase() ?? tenant.email,
    });
    const saved = await this.tenants.save(tenant);
    await this.logActivity(adminId, adminEmail, 'TENANT_UPDATED', 'tenant', id, tenant.stationName);
    return saved;
  }

  async changeStatus(id: string, status: string, adminId: string, adminEmail: string, reason?: string) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const oldStatus = tenant.status;
    tenant.status = status;
    const saved = await this.tenants.save(tenant);
    await this.logActivity(adminId, adminEmail, 'TENANT_STATUS_CHANGED', 'tenant', id, tenant.stationName, {
      from: oldStatus,
      to: status,
      reason,
    });
    return saved;
  }

  async resetTenantSessions(id: string, adminId: string, adminEmail: string) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    await this.dataSource.query(
      `UPDATE portal_users SET status = 'INACTIVE' WHERE tenant_id = $1 AND status = 'ACTIVE'`,
      [id],
    );

    await this.logActivity(adminId, adminEmail, 'TENANT_SESSIONS_RESET', 'tenant', id, tenant.stationName);
    return { ok: true };
  }

  async updateSettings(id: string, settings: Record<string, string | boolean | number | null>, adminId: string, adminEmail: string) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const result = await this.tenantsService.updateSettings(id, settings);
    await this.logActivity(adminId, adminEmail, 'TENANT_SETTINGS_UPDATED', 'tenant', id, tenant.stationName, { settings });
    return result;
  }

  private async logActivity(
    adminId: string,
    adminEmail: string,
    action: string,
    targetType?: string,
    targetId?: string,
    targetLabel?: string,
    details?: Record<string, unknown>,
  ) {
    await this.activityLogs.save(
      this.activityLogs.create({ adminId, adminEmail, action, targetType, targetId, targetLabel, details }),
    );
  }
}
