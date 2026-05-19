import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePumpNozzleDto {
  @IsString()
  nozzle_name: string;

  @IsString()
  nozzle_code: string;

  @IsUUID()
  product_id: string;
}

export class CreatePumpDto {
  @IsString()
  pump_code: string;

  @IsString()
  pump_name: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePumpNozzleDto)
  nozzles: CreatePumpNozzleDto[];
}

export class UpdatePumpDto {
  @IsOptional()
  @IsString()
  pump_name?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateStandaloneNozzleDto extends CreatePumpNozzleDto {
  @IsUUID()
  pump_id: string;
}
