import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PlatformRejectRegistrationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
