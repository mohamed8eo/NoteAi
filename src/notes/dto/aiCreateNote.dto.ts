import { IsNotEmpty, IsString } from 'class-validator';

export class AiCreateNoteDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
