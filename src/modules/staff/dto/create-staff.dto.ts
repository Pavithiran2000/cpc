import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  employee_no: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nic?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsUUID()
  operational_role_id: string;

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
  @IsDateString()
  joined_date?: string;
}
