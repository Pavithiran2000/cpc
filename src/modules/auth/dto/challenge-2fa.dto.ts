import { IsString, Length } from 'class-validator';

export class Challenge2faDto {
  @IsString()
  challenge_token: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
