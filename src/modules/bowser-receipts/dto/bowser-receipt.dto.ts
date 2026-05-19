import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BowserReceiptLineDto {
  @IsUUID()
  tank_id: string;

  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(0.001)
  received_litres: number;

  @IsNumber()
  @Min(0)
  unit_cost: number;
}

export class CreateBowserReceiptDto {
  @IsString()
  receipt_no: string;

  @IsOptional()
  @IsString()
  supplier_name?: string;

  @IsOptional()
  @IsString()
  vehicle_no?: string;

  @IsOptional()
  @IsString()
  driver_name?: string;

  @IsDateString()
  received_date: string;

  @IsOptional()
  @IsUUID()
  stock_order_id?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BowserReceiptLineDto)
  lines: BowserReceiptLineDto[];
}

export class ApproveBowserReceiptDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BowserReceiptLineDto)
  lines?: BowserReceiptLineDto[];
}
