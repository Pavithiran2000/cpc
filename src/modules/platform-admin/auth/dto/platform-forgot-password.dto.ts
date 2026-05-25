import { IsEmail, IsNotEmpty } from 'class-validator';

export class PlatformForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
