import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Observable, tap } from 'rxjs';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { RequestUser } from '../types/request-user.type';

const TRACKED_ENTITIES: Record<string, string> = {
  portal_users: 'portal_user',
  staff: 'staff_profile',
  'products/:id': 'product',
  'products/:id/prices': 'product_price',
  'shift-sessions/:id': 'shift_session',
  'cheques/:id/status': 'cheque_registry',
  'salary-deductions/:id/approve': 'salary_deduction',
};

@Injectable()
export class EntityChangeLogInterceptor implements NestInterceptor {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request['user'] as RequestUser | undefined;
    if (!user) return next.handle();

    const path = request.route?.path as string | undefined;
    const entityId = (request.params?.id as string | undefined) ?? 'unknown';

    let entityType = 'unknown';
    if (path) {
      for (const [pattern, etype] of Object.entries(TRACKED_ENTITIES)) {
        if (path.includes(pattern.replace(':id', entityId)) || path.endsWith(pattern.split(':id')[0].replace(/\/$/, ''))) {
          entityType = etype;
          break;
        }
      }
    }

    const action = method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE';
    const ipAddress = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? request.ip ?? '';
    const userAgent = request.headers['user-agent'] ?? '';

    return next.handle().pipe(
      tap((responseData) => {
        void this.dataSource.query(
          `INSERT INTO entity_change_logs (tenant_id, actor_user_id, entity_type, entity_id, action, changed_fields, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            user.tenantId,
            user.id,
            entityType,
            entityId,
            action,
            JSON.stringify(request.body ?? {}),
            ipAddress,
            userAgent,
          ],
        );
      }),
    );
  }
}
