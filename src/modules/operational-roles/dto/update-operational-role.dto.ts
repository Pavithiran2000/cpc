import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateOperationalRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  requires_attendance?: boolean;

  @IsOptional()
  @IsBoolean()
  liable_for_cash_shortfall?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
