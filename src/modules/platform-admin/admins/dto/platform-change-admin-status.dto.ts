import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlatformAdminStatus } from '../../../../database/entities';

export class PlatformChangeAdminStatusDto {
  @IsEnum(PlatformAdminStatus)
  status: PlatformAdminStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
