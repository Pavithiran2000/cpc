import { IsOptional, IsString, MinLength } from 'class-validator';

export class PlatformUpdateAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
