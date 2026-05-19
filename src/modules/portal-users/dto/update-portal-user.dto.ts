import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PortalRole } from '../../../common/enums/portal-role.enum';

export class UpdatePortalUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(PortalRole)
  portal_role?: PortalRole;

  @IsOptional()
  @IsString()
  status?: string;
}
