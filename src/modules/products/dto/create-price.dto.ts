import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePriceDto {
  @IsNumber()
  @Min(0.01)
  selling_price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @IsDateString()
  effective_from: string;
}
