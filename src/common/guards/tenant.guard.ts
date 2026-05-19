import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_TENANT_KEY } from '../decorators/skip-tenant.decorator';
import { RequestUser } from '../types/request-user.type';

interface GuardedRequest {
  user?: RequestUser;
  tenantId?: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const skipTenant = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || skipTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest<GuardedRequest>();
    if (!request.user?.tenantId) {
      throw new ForbiddenException('Authenticated tenant context is required');
    }

    request.tenantId = request.user.tenantId;

    if (request.body && 'tenant_id' in request.body) {
      delete request.body.tenant_id;
    }
    if (request.query && 'tenant_id' in request.query) {
      delete request.query.tenant_id;
    }

    return true;
  }
}
