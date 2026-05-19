import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateOperationalRoleDto {
  @IsString()
  name: string;

  @IsBoolean()
  requires_attendance: boolean;

  @IsBoolean()
  liable_for_cash_shortfall: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
