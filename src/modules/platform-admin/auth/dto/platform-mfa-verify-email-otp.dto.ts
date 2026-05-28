import { IsString, Length } from 'class-validator';

export class PlatformMfaVerifyEmailOtpDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
