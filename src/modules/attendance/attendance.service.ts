import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListQueryDto } from '../../common/dto';
import { executeListQuery } from '../../common/utils/list-query';
import { StaffProfile, StaffShiftAttendance } from '../../database/entities';
import { AuditService } from '../audit/audit.service';
import { ClockInDto, ClockOutDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(StaffShiftAttendance) private readonly attendance: Repository<StaffShiftAttendance>,
    @InjectRepository(StaffProfile) private readonly staff: Repository<StaffProfile>,
    private readonly audit: AuditService,
  ) {}

  list(tenantId: string, query: ListQueryDto & { shift_session_id?: string }) {
    const qb = this.attendance.createQueryBuilder('attendance').where('attendance.tenantId = :tenantId', { tenantId });
    if (query.shift_session_id) {
      qb.andWhere('attendance.shiftSessionId = :shiftSessionId', { shiftSessionId: query.shift_session_id });
    }
    return executeListQuery(qb, query, {
      alias: 'attendance',
      statusColumn: 'attendance.attendanceStatus',
      dateColumn: 'attendance.createdAt',
      sortColumns: {
        created_at: 'attendance.createdAt',
        clock_in_at: 'attendance.clockInAt',
        clock_out_at: 'attendance.clockOutAt',
        attendance_status: 'attendance.attendanceStatus',
      },
      defaultSort: 'attendance.createdAt',
    });
  }

  async clockIn(tenantId: string, dto: ClockInDto, actorUserId: string) {
    await this.ensureStaff(tenantId, dto.staff_id);
    const existing = await this.attendance.findOne({ where: { tenantId, shiftSessionId: dto.shift_session_id, staffId: dto.staff_id } });
    const record = await this.attendance.save(
      this.attendance.create({
        ...existing,
        tenantId,
        shiftSessionId: dto.shift_session_id,
        staffId: dto.staff_id,
        clockInAt: dto.clock_in_at ? new Date(dto.clock_in_at) : new Date(),
      }),
    );
    await this.audit.record({ tenantId, actorUserId, moduleName: 'attendance', action: 'CLOCK_IN', newValue: record });
    return record;
  }

  async clockOut(tenantId: string, dto: ClockOutDto, actorUserId: string) {
    const existing = await this.attendance.findOne({ where: { tenantId, shiftSessionId: dto.shift_session_id, staffId: dto.staff_id } });
    if (!existing) throw new NotFoundException('Attendance record not found');
    existing.clockOutAt = dto.clock_out_at ? new Date(dto.clock_out_at) : new Date();
    const saved = await this.attendance.save(existing);
    await this.audit.record({ tenantId, actorUserId, moduleName: 'attendance', action: 'CLOCK_OUT', newValue: saved });
    return saved;
  }

  private async ensureStaff(tenantId: string, staffId: string) {
    const staff = await this.staff.findOne({ where: { tenantId, id: staffId, status: 'ACTIVE' } });
    if (!staff) throw new NotFoundException('Staff profile not found');
  }
}
