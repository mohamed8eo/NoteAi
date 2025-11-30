import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LogInDto {
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
