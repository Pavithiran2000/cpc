import { SetMetadata } from '@nestjs/common';
import { PlatformRole } from '../../../../database/entities';

export const PLATFORM_ROLES_KEY = 'platformRoles';
export const PlatformRoles = (...roles: PlatformRole[]) => SetMetadata(PLATFORM_ROLES_KEY, roles);
