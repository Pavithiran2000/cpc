import { IsString, MinLength } from 'class-validator';

export class PlatformChangePasswordDto {
  @IsString()
  current_password: string;

  @IsString()
  @MinLength(8)
  new_password: string;

  @IsString()
  @MinLength(8)
  confirm_password: string;
}
