import { IsString, IsUUID, Matches } from 'class-validator';

export class RegisterVerifyDto {
  @IsUUID()
  registration_id: string;

  @IsString()
  @Matches(/^[0-9]{6}$/)
  code: string;
}
