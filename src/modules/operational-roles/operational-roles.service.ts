import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { OperationalRole } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateOperationalRoleDto } from './dto/create-operational-role.dto';
import { UpdateOperationalRoleDto } from './dto/update-operational-role.dto';

@Injectable()
export class OperationalRolesService {
  constructor(
    @InjectRepository(OperationalRole) private readonly roles: Repository<OperationalRole>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto) {
    const qb = this.roles.createQueryBuilder('role').where('role.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'role',
      searchColumns: ['role.name', 'role.description'],
      statusColumn: 'role.status',
      dateColumn: 'role.createdAt',
      sortColumns: {
        name: 'role.name',
        status: 'role.status',
        created_at: 'role.createdAt',
      },
      defaultSort: 'role.name',
    });
  }

  async create(tenantId: string, dto: CreateOperationalRoleDto, actorUserId: string) {
    try {
      const role = await this.roles.save(
        this.roles.create({
          tenantId,
          name: dto.name.trim(),
          requiresAttendance: dto.requires_attendance,
          liableForCashShortfall: dto.liable_for_cash_shortfall,
          description: dto.description,
        }),
      );
      await this.audit.record({ tenantId, actorUserId, moduleName: 'operational_roles', action: 'CREATE', newValue: role });
      return role;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Operational role with this name already exists for this tenant');
      }
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateOperationalRoleDto, actorUserId: string) {
    const role = await this.roles.findOne({ where: { tenantId, id } });
    if (!role) throw new NotFoundException('Operational role not found');
    Object.assign(role, {
      name: dto.name ?? role.name,
      requiresAttendance: dto.requires_attendance ?? role.requiresAttendance,
      liableForCashShortfall: dto.liable_for_cash_shortfall ?? role.liableForCashShortfall,
      description: dto.description ?? role.description,
      status: dto.status ?? role.status,
    });
    const saved = await this.roles.save(role);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'operational_roles', action: 'UPDATE', newValue: saved });
    return saved;
  }
}

function isUniqueViolation(error: unknown) {
  return error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505';
}
