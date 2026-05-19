import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from '../../database/entities';

export interface AuditPayload {
  tenantId?: string;
  actorUserId?: string;
  moduleName: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async record(payload: AuditPayload, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(AuditLog) : this.auditLogs;
    return repo.save(repo.create(payload));
  }
}
