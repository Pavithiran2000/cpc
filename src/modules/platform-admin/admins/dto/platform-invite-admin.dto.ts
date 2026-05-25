import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { PlatformRole } from '../../../../database/entities';

export enum InvitableRole {
  Admin = 'ADMIN',
  Support = 'SUPPORT',
}

export class PlatformInviteAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(InvitableRole)
  platform_role: InvitableRole;
}
