import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  employee_no?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nic?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUUID()
  operational_role_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basic_salary?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shift_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ot_rate?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  joined_date?: string;
}
