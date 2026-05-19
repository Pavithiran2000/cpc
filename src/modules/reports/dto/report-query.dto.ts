import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../../common/dto';

export class ReportQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  staff_id?: string;
}

export class GenerateCpcStockReportDto {
  @IsDateString()
  report_date: string;

  @IsOptional()
  @IsIn(['DAILY_STOCK', 'MONTHLY_STOCK', 'CPC_COMPLIANCE'])
  report_type?: 'DAILY_STOCK' | 'MONTHLY_STOCK' | 'CPC_COMPLIANCE';
}

export class SubmitCpcStockReportDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
