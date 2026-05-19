import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PortalRole } from '../../../common/enums/portal-role.enum';

export class CreatePortalUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(PortalRole)
  portal_role: PortalRole;
}
