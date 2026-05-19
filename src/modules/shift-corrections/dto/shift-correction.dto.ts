import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateShiftCorrectionDto {
  @IsUUID()
  shift_session_id: string;

  @IsIn(['METER_READING', 'CASH', 'ASSIGNMENT', 'OTHER'])
  correction_type: string;

  @IsString()
  @IsNotEmpty()
  field_name: string;

  @IsNotEmpty()
  old_value: unknown;

  @IsNotEmpty()
  new_value: unknown;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
