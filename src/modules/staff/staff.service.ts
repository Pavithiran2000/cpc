import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { OperationalRole, StaffProfile } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffProfile) private readonly staff: Repository<StaffProfile>,
    @InjectRepository(OperationalRole) private readonly roles: Repository<OperationalRole>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto) {
    const qb = this.staff
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.operationalRole', 'role')
      .where('staff.tenantId = :tenantId', { tenantId });
    return executeListQuery(qb, query, {
      alias: 'staff',
      searchColumns: ['staff.employeeNo', 'staff.name', 'staff.phone', 'staff.nic', 'role.name'],
      statusColumn: 'staff.status',
      dateColumn: 'staff.createdAt',
      sortColumns: {
        employee_no: 'staff.employeeNo',
        name: 'staff.name',
        role: 'role.name',
        status: 'staff.status',
        joined_date: 'staff.joinedDate',
        created_at: 'staff.createdAt',
      },
      defaultSort: 'staff.createdAt',
    });
  }

  async findOne(tenantId: string, id: string) {
    const staff = await this.staff.findOne({ where: { tenantId, id }, relations: { operationalRole: true } });
    if (!staff) throw new NotFoundException('Staff profile not found');
    return staff;
  }

  async create(tenantId: string, dto: CreateStaffDto, actorUserId: string) {
    await this.ensureRole(tenantId, dto.operational_role_id);
    const staff = await this.staff.save(
      this.staff.create({
        tenantId,
        employeeNo: dto.employee_no,
        name: dto.name,
        phone: dto.phone,
        nic: dto.nic,
        address: dto.address,
        operationalRoleId: dto.operational_role_id,
        basicSalary: String(dto.basic_salary ?? 0),
        shiftRate: String(dto.shift_rate ?? 0),
        otRate: String(dto.ot_rate ?? 0),
        joinedDate: dto.joined_date,
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'staff', action: 'CREATE', newValue: staff });
    return staff;
  }

  async update(tenantId: string, id: string, dto: UpdateStaffDto, actorUserId: string) {
    const staff = await this.findOne(tenantId, id);
    if (dto.operational_role_id) await this.ensureRole(tenantId, dto.operational_role_id);
    Object.assign(staff, {
      employeeNo: dto.employee_no ?? staff.employeeNo,
      name: dto.name ?? staff.name,
      phone: dto.phone ?? staff.phone,
      nic: dto.nic ?? staff.nic,
      address: dto.address ?? staff.address,
      operationalRoleId: dto.operational_role_id ?? staff.operationalRoleId,
      basicSalary: dto.basic_salary === undefined ? staff.basicSalary : String(dto.basic_salary),
      shiftRate: dto.shift_rate === undefined ? staff.shiftRate : String(dto.shift_rate),
      otRate: dto.ot_rate === undefined ? staff.otRate : String(dto.ot_rate),
      status: dto.status ?? staff.status,
      joinedDate: dto.joined_date ?? staff.joinedDate,
    });
    const saved = await this.staff.save(staff);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'staff', action: 'UPDATE', newValue: saved });
    return saved;
  }

  async deactivate(tenantId: string, id: string, actorUserId: string) {
    const staff = await this.findOne(tenantId, id);
    staff.status = 'INACTIVE';
    const saved = await this.staff.save(staff);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'staff', action: 'DEACTIVATE', newValue: { id } });
    return saved;
  }

  private async ensureRole(tenantId: string, roleId: string) {
    const role = await this.roles.findOne({ where: { tenantId, id: roleId, status: 'ACTIVE' } });
    if (!role) throw new NotFoundException('Operational role not found');
    return role;
  }
}
