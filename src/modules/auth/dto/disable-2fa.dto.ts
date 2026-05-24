import { IsString, Length, MinLength } from 'class-validator';

export class Disable2faDto {
  @IsString()
  @MinLength(1)
  password: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
