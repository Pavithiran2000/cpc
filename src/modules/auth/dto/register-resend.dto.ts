import { IsUUID } from 'class-validator';

export class RegisterResendDto {
  @IsUUID()
  registration_id: string;
}
