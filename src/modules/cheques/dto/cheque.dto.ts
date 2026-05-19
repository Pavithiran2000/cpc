import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateChequeDto {
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsString()
  cheque_no: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  branch_name?: string;

  @IsOptional()
  @IsDateString()
  cheque_date?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  received_date: string;

  @IsOptional()
  @IsDateString()
  deposit_date?: string;
}

export class UpdateChequeStatusDto {
  @IsIn(['RECEIVED', 'DEPOSITED', 'CLEARED', 'RETURNED', 'CANCELLED'])
  status: 'RECEIVED' | 'DEPOSITED' | 'CLEARED' | 'RETURNED' | 'CANCELLED';
}
