import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class NozzleAssignmentDto {
  @IsUUID()
  nozzle_id: string;

  @IsUUID()
  pumper_id: string;
}

export class AssignNozzlesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NozzleAssignmentDto)
  assignments: NozzleAssignmentDto[];
}

export class MeterReadingDto {
  @IsUUID()
  nozzle_id: string;

  @IsNumber()
  @Min(0)
  meter_reading: number;
}

export class ReadingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MeterReadingDto)
  readings: MeterReadingDto[];
}

export class CashSubmissionDto {
  @IsUUID()
  pumper_id: string;

  @IsNumber()
  @Min(0)
  actual_cash: number;
}

export class CashSubmissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CashSubmissionDto)
  submissions: CashSubmissionDto[];
}

export class CloseShiftDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MeterReadingDto)
  closing_readings: MeterReadingDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CashSubmissionDto)
  cash_submissions: CashSubmissionDto[];

  @IsOptional()
  override_attendance?: boolean;
}
