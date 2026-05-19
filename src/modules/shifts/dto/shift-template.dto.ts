import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateShiftTemplateDto {
  @IsString()
  shift_name: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  start_time: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  end_time: string;

  @IsOptional()
  @IsBoolean()
  is_night_shift?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  sequence_no?: number;
}

export class UpdateShiftTemplateDto {
  @IsOptional()
  @IsString()
  shift_name?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  start_time?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  end_time?: string;

  @IsOptional()
  @IsBoolean()
  is_night_shift?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  sequence_no?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateShiftSessionDto {
  @IsString()
  shift_template_id: string;

  @IsDateString()
  business_date: string;

  @IsOptional()
  @IsString()
  manager_id?: string;
}
