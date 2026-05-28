import { IsIn, IsNotEmpty, IsString, Length } from 'class-validator';

export class PlatformMfaVerifyLoginDto {
  @IsString()
  @IsNotEmpty()
  temp_token: string;

  @IsString()
  @Length(6, 10)
  code: string;

  @IsIn(['totp', 'email', 'backup'])
  method: 'totp' | 'email' | 'backup';
}
