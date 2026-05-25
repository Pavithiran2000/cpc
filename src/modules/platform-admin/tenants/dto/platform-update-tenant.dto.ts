import { IsEmail, IsOptional, IsString } from 'class-validator';

export class PlatformUpdateTenantDto {
  @IsOptional()
  @IsString()
  station_name?: string;

  @IsOptional()
  @IsString()
  owner_name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  contact_number?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
