import { IsString, Length } from 'class-validator';

export class PlatformMfaEnableDto {
  @IsString()
  @Length(6, 6)
  totp_code: string;
}
