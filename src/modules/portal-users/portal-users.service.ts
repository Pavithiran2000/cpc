import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { PortalUser } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreatePortalUserDto } from './dto/create-portal-user.dto';
import { UpdatePortalUserDto } from './dto/update-portal-user.dto';

@Injectable()
export class PortalUsersService {
  constructor(
    @InjectRepository(PortalUser) private readonly users: Repository<PortalUser>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto) {
    const qb = this.users.createQueryBuilder('user').where('user.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'user',
      searchColumns: ['user.name', 'user.email', 'user.phone', 'user.portalRole'],
      statusColumn: 'user.status',
      dateColumn: 'user.createdAt',
      sortColumns: {
        name: 'user.name',
        email: 'user.email',
        portal_role: 'user.portalRole',
        status: 'user.status',
        created_at: 'user.createdAt',
      },
      defaultSort: 'user.createdAt',
    });
  }

  async create(tenantId: string, dto: CreatePortalUserDto, actorUserId: string) {
    const user = await this.users.save(
      this.users.create({
        tenantId,
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 12),
        portalRole: dto.portal_role,
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'portal_users', action: 'CREATE', newValue: { id: user.id, email: user.email } });
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdatePortalUserDto, actorUserId: string) {
    const user = await this.users.findOne({ where: { tenantId, id } });
    if (!user) throw new NotFoundException('Portal user not found');
    Object.assign(user, {
      name: dto.name ?? user.name,
      phone: dto.phone ?? user.phone,
      portalRole: dto.portal_role ?? user.portalRole,
      status: dto.status ?? user.status,
    });
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 12);
    }
    const saved = await this.users.save(user);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'portal_users', action: 'UPDATE', newValue: { id } });
    return saved;
  }
}
