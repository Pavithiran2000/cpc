import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCreditCustomerDto {
  @IsString()
  customer_name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  credit_limit?: number;
}

export class CreateCreditSaleDto {
  @IsOptional()
  @IsUUID()
  shift_session_id?: string;

  @IsUUID()
  customer_id: string;

  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0.01)
  unit_price: number;

  @IsOptional()
  @IsDateString()
  due_date?: string;
}

export class CreateDueCollectionDto {
  @IsUUID()
  customer_id: string;

  @IsOptional()
  @IsUUID()
  credit_sale_id?: string;

  @IsNumber()
  @Min(0.01)
  amount_collected: number;

  @IsDateString()
  collection_date: string;

  @IsString()
  payment_method: string;
}
