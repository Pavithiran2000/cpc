import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  product_code: string;

  @IsString()
  product_name: string;

  @IsIn(['FUEL', 'GAS', 'LUBRICANT'])
  category: 'FUEL' | 'GAS' | 'LUBRICANT';

  @IsUUID()
  measurement_unit_id: string;

  @IsOptional()
  @IsBoolean()
  is_fuel?: boolean;

  @IsOptional()
  @IsBoolean()
  is_lubricant?: boolean;

  @IsOptional()
  @IsBoolean()
  is_gas?: boolean;
}
