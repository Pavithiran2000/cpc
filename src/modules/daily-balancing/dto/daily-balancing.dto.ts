import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDailyBalanceDto {
  @IsDateString()
  business_date: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  opening_cash?: number;

  @IsNumber()
  @Min(0)
  expected_cash: number;

  @IsNumber()
  @Min(0)
  actual_cash: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bank_deposit?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
