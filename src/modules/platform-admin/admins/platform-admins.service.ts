import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { PlatformActivityLog, PlatformAdmin, PlatformAdminRefreshToken, PlatformAdminStatus, PlatformRole } from '../../../database/entities';
import { EmailService } from '../../email/email.service';
import { paginated, safeSortBy } from '../../../common/dto';
import { PlatformInviteAdminDto } from './dto/platform-invite-admin.dto';
import { PlatformUpdateAdminDto } from './dto/platform-update-admin.dto';
import { PlatformChangeRoleDto } from './dto/platform-change-role.dto';
import { PlatformChangeAdminStatusDto } from './dto/platform-change-admin-status.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PlatformAdminsService {
  constructor(
    @InjectRepository(PlatformAdmin) private readonly admins: Repository<PlatformAdmin>,
    @InjectRepository(PlatformAdminRefreshToken) private readonly tokens: Repository<PlatformAdminRefreshToken>,
    @InjectRepository(PlatformActivityLog) private readonly activityLogs: Repository<PlatformActivityLog>,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    platform_role?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const orderBy = safeSortBy(
      query.sort_by,
      { name: 'a.name', email: 'a.email', created_at: 'a.createdAt', status: 'a.status', platform_role: 'a.platformRole' },
      'a.createdAt',
    );
    const direction = (query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    const qb = this.admins
      .createQueryBuilder('a')
      .select(['a.id', 'a.email', 'a.name', 'a.platformRole', 'a.status', 'a.lastLoginAt', 'a.createdAt', 'a.updatedAt', 'a.twoFactorEnabled', 'a.mfaMethod', 'a.invitedBy'])
      .addSelect(
        (sub) => sub.select('pa.email').from('platform_admins', 'pa').where('pa.id = a.invited_by'),
        'invited_by_email',
      )
      .addSelect(
        (sub) => sub.select('pa.name').from('platform_admins', 'pa').where('pa.id = a.invited_by'),
        'invited_by_name',
      );

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.platform_role) qb.andWhere('a.platformRole = :role', { role: query.platform_role });
    if (query.search?.trim()) {
      const s = `%${query.search.trim().replace(/[%_]/g, '\\$&')}%`;
      qb.andWhere('(a.name ILIKE :s OR a.email ILIKE :s)', { s });
    }

    qb.orderBy(orderBy, direction).take(limit).skip((page - 1) * limit);
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, { page, limit });
  }

  async findOne(id: string) {
    const admin = await this.admins.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'platformRole', 'status', 'lastLoginAt', 'createdAt', 'updatedAt', 'twoFactorEnabled', 'mfaMethod', 'invitedBy', 'failedLoginAttempts', 'lockedUntil'],
    });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async invite(dto: PlatformInviteAdminDto, invitedBy: { id: string; email: string }) {
    const existing = await this.admins.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('An admin with this email already exists');

    const tempPassword = randomBytes(9).toString('base64url').slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const admin = await this.admins.save(
      this.admins.create({
        email: dto.email.toLowerCase(),
        name: dto.name,
        platformRole: dto.platform_role as unknown as PlatformRole,
        passwordHash,
        status: PlatformAdminStatus.Active,
        invitedBy: invitedBy.id,
      }),
    );

    const platformUrl = this.config.get<string>('app.frontendPlatformUrl') ?? 'http://localhost:3000/platform';
    await this.email.sendPlatformAdminInviteEmail({
      to: admin.email,
      name: admin.name,
      tempPassword,
      loginUrl: `${platformUrl}/login`,
    });

    await this.logActivity(invitedBy.id, invitedBy.email, 'ADMIN_INVITED', 'platform_admin', admin.id, admin.email, {
      role: admin.platformRole,
    });

    return this.findOne(admin.id);
  }

  async update(id: string, dto: PlatformUpdateAdminDto, requestingAdmin: { id: string; email: string }) {
    const admin = await this.admins.findOneBy({ id });
    if (!admin) throw new NotFoundException('Admin not found');
    if (dto.name !== undefined) admin.name = dto.name;
    const saved = await this.admins.save(admin);
    await this.logActivity(requestingAdmin.id, requestingAdmin.email, 'ADMIN_UPDATED', 'platform_admin', id, admin.email);
    return this.findOne(saved.id);
  }

  async changeRole(id: string, dto: PlatformChangeRoleDto, requestingAdmin: { id: string; email: string; platformRole: PlatformRole }) {
    if (requestingAdmin.platformRole !== PlatformRole.SuperAdmin) throw new ForbiddenException('Only SUPER_ADMIN can change roles');
    if (id === requestingAdmin.id) throw new BadRequestException('Cannot change your own role');

    const admin = await this.admins.findOneBy({ id });
    if (!admin) throw new NotFoundException('Admin not found');

    const oldRole = admin.platformRole;
    admin.platformRole = dto.platform_role as unknown as PlatformRole;
    await this.admins.save(admin);

    await this.logActivity(requestingAdmin.id, requestingAdmin.email, 'ADMIN_ROLE_CHANGED', 'platform_admin', id, admin.email, {
      from: oldRole,
      to: dto.platform_role,
    });

    return this.findOne(id);
  }

  async changeStatus(id: string, dto: PlatformChangeAdminStatusDto, requestingAdmin: { id: string; email: string }) {
    if (id === requestingAdmin.id) throw new BadRequestException('Cannot change your own status');

    const admin = await this.admins.findOneBy({ id });
    if (!admin) throw new NotFoundException('Admin not found');

    const oldStatus = admin.status;
    admin.status = dto.status;
    await this.admins.save(admin);

    if (dto.status === PlatformAdminStatus.Suspended || dto.status === PlatformAdminStatus.Inactive) {
      await this.revokeTokens(id);
    }

    await this.logActivity(requestingAdmin.id, requestingAdmin.email, 'ADMIN_STATUS_CHANGED', 'platform_admin', id, admin.email, {
      from: oldStatus,
      to: dto.status,
      reason: dto.reason,
    });

    return this.findOne(id);
  }

  async remove(id: string, requestingAdmin: { id: string; email: string; platformRole: PlatformRole }) {
    if (requestingAdmin.platformRole !== PlatformRole.SuperAdmin) throw new ForbiddenException('Only SUPER_ADMIN can delete admins');
    if (id === requestingAdmin.id) throw new BadRequestException('Cannot delete your own account');

    const admin = await this.admins.findOneBy({ id });
    if (!admin) throw new NotFoundException('Admin not found');

    await this.revokeTokens(id);
    await this.admins.delete(id);

    await this.logActivity(requestingAdmin.id, requestingAdmin.email, 'ADMIN_DELETED', 'platform_admin', id, admin.email);

    return { ok: true };
  }

  async resetAdminPassword(id: string, requestingAdmin: { id: string; email: string }) {
    const admin = await this.admins.findOneBy({ id });
    if (!admin) throw new NotFoundException('Admin not found');

    const tempPassword = randomBytes(9).toString('base64url').slice(0, 12);
    admin.passwordHash = await bcrypt.hash(tempPassword, 12);
    await this.admins.save(admin);

    await this.revokeTokens(id);

    const platformUrl = this.config.get<string>('app.frontendPlatformUrl') ?? 'http://localhost:3000/platform';
    await this.email.sendPlatformAdminInviteEmail({
      to: admin.email,
      name: admin.name,
      tempPassword,
      loginUrl: `${platformUrl}/login`,
    });

    await this.logActivity(requestingAdmin.id, requestingAdmin.email, 'ADMIN_PASSWORD_RESET', 'platform_admin', id, admin.email);

    return { ok: true };
  }

  async revokeAllSessions(id: string, requestingAdmin: { id: string; email: string }) {
    const admin = await this.admins.findOneBy({ id });
    if (!admin) throw new NotFoundException('Admin not found');

    await this.revokeTokens(id);

    await this.logActivity(requestingAdmin.id, requestingAdmin.email, 'ADMIN_SESSIONS_REVOKED', 'platform_admin', id, admin.email);

    return { ok: true };
  }

  private async revokeTokens(adminId: string) {
    await this.tokens
      .createQueryBuilder()
      .update()
      .set({ revokedAt: new Date() })
      .where('admin_id = :adminId AND revoked_at IS NULL', { adminId })
      .execute();
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
