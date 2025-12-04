import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class GenerateImageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Prompt must be at least 3 characters long' })
  prompt: string;
}

