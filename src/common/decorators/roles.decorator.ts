import { SetMetadata } from '@nestjs/common';
import { PortalRole } from '../enums/portal-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: PortalRole[]) => SetMetadata(ROLES_KEY, roles);
