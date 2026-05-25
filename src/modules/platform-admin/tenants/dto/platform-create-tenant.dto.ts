import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class PlatformCreateTenantDto {
  @IsString()
  station_code: string;

  @IsString()
  station_name: string;

  @IsOptional()
  @IsString()
  owner_name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  address_line1?: string;

  @IsOptional()
  @IsString()
  address_line2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  contact_number?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEmail()
  owner_email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  owner_password?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  geo_city_id?: number;
}
