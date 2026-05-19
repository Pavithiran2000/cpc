import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateFuelTankDto {
  @IsString()
  tank_code: string;

  @IsUUID()
  fuel_product_id: string;

  @IsNumber()
  @Min(0.001)
  capacity_litres: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  current_stock_litres?: number;
}

export class StockAdjustmentDto {
  @IsUUID()
  product_id: string;

  @IsIn(['MANUAL_ADJUSTMENT', 'NIGHT_VERIFICATION_ADJUSTMENT', 'RETURN'])
  movement_type: 'MANUAL_ADJUSTMENT' | 'NIGHT_VERIFICATION_ADJUSTMENT' | 'RETURN';

  @IsNumber()
  quantity_in: number;

  @IsNumber()
  quantity_out: number;

  @IsString()
  reference_type: string;

  @IsUUID()
  reference_id: string;
}

export class NightVerificationDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  @Min(0)
  physical_stock: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
