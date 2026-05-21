import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterStartDto {
  @IsString()
  @Matches(/^[A-Za-z0-9-]{3,30}$/)
  station_code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  station_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  owner_name: string;

  @IsString()
  @Matches(/^\+?[0-9\s\-()]{7,25}$/)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  address_line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  address_line2?: string;

  @IsInt()
  province_id: number;

  @IsInt()
  district_id: number;

  @ValidateIf((dto: RegisterStartDto) => !dto.custom_city_name)
  @IsInt()
  geo_city_id?: number;

  @ValidateIf((dto: RegisterStartDto) => !dto.geo_city_id)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  custom_city_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  postal_code?: string;

  @IsEmail()
  @MaxLength(150)
  owner_email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
