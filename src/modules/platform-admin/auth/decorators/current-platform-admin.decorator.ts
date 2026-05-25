import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PlatformRole } from '../../../../database/entities';

export interface PlatformAdminUser {
  id: string;
  platformRole: PlatformRole;
  email: string;
}

export const CurrentPlatformAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PlatformAdminUser => {
    const request = ctx.switchToHttp().getRequest<{ user: PlatformAdminUser }>();
    return request.user;
  },
);
