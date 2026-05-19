import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StockOrderItemDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(0.001)
  ordered_quantity: number;

  @IsNumber()
  @Min(0)
  unit_cost: number;
}

export class CreateStockOrderDto {
  @IsString()
  order_no: string;

  @IsOptional()
  @IsString()
  supplier_name?: string;

  @IsDateString()
  order_date: string;

  @IsOptional()
  @IsDateString()
  expected_delivery_date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockOrderItemDto)
  items: StockOrderItemDto[];
}

export class SupplierPaymentDto {
  @IsOptional()
  @IsUUID()
  stock_order_id?: string;

  @IsString()
  payment_type: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  payment_date: string;

  @IsOptional()
  @IsString()
  reference_no?: string;
}
