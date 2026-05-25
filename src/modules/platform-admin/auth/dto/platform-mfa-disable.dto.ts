import { IsNotEmpty, IsString, Length } from 'class-validator';

export class PlatformMfaDisableDto {
  @IsString()
  @Length(6, 10)
  code: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
