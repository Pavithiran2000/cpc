import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ClockInDto {
  @IsUUID()
  shift_session_id: string;

  @IsUUID()
  staff_id: string;

  @IsOptional()
  @IsDateString()
  clock_in_at?: string;
}

export class ClockOutDto {
  @IsUUID()
  shift_session_id: string;

  @IsUUID()
  staff_id: string;

  @IsOptional()
  @IsDateString()
  clock_out_at?: string;
}
