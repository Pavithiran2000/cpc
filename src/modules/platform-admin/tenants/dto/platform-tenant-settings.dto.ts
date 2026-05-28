import { IsObject } from 'class-validator';

export class PlatformTenantSettingsDto {
  @IsObject()
  settings: Record<string, string | boolean | number | null>;
}
