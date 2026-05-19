import { PortalRole } from '../enums/portal-role.enum';
import { Request } from 'express';

export interface RequestUser {
  id: string;
  tenantId: string;
  portalRole: PortalRole;
  email: string;
}

export interface TenantRequest extends Request {
  user: RequestUser;
  tenantId: string;
}
