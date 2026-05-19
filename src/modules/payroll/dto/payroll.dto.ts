import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class CreatePayrollRunDto {
  @IsDateString()
  period_start: string;

  @IsDateString()
  period_end: string;
}

export class FinalizePayrollRunDto {
  @IsOptional()
  @IsBoolean()
  attendance_override?: boolean;
}
