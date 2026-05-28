import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '../../../../database/entities';
import { PLATFORM_ROLES_KEY } from '../decorators/platform-roles.decorator';

interface PlatformAdminRequest {
  user?: { id: string; platformRole: PlatformRole; email: string };
}

@Injectable()
export class PlatformRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(PLATFORM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<PlatformAdminRequest>();
    const userRole = request.user?.platformRole;
    if (!userRole) throw new ForbiddenException('Insufficient role');

    if (userRole === PlatformRole.SuperAdmin) return true;
    if (requiredRoles.includes(userRole)) return true;

    throw new ForbiddenException('Insufficient role');
  }
}
