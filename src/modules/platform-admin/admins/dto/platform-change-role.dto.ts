import { IsEnum } from 'class-validator';
import { InvitableRole } from './platform-invite-admin.dto';

export class PlatformChangeRoleDto {
  @IsEnum(InvitableRole)
  platform_role: InvitableRole;
}
