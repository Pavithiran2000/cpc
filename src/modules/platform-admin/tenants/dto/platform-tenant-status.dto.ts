import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum TenantStatusChange {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED',
}

export class PlatformTenantStatusDto {
  @IsEnum(TenantStatusChange)
  status: TenantStatusChange;

  @IsOptional()
  @IsString()
  reason?: string;
}
