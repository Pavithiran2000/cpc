import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  station_code: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
