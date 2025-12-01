import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNoteDto } from './dto/createNote.dto';
import { GetUserId } from 'src/auth/get-userdecorator';
import { UpdateNoteDto } from './dto/updateNote.dto';
import { AiCreateNoteDto } from './dto/aiCreateNote.dto';

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private noteService: NotesService) {}

  // create note  title content  check if the user is he own this note
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createNote(
    @Body() createNoteDto: CreateNoteDto,
    @GetUserId() userId: string,
  ) {
    return await this.noteService.createNote(createNoteDto, userId);
  }

  @Get('GetAll')
  @HttpCode(HttpStatus.OK)
  async getAllNotes(@GetUserId() userId: string) {
    return await this.noteService.getAllNotes(userId);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getNoteById(@Param('id') id: string, @GetUserId() userId: string) {
    return await this.noteService.getNoteById(id, userId);
  }

  @Patch('/:id')
  @HttpCode(HttpStatus.OK)
  async updateNote(
    @Param('id') id: string,
    @GetUserId() userId: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return await this.noteService.updateNote(id, userId, updateNoteDto);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.OK)
  async deleteNote(@Param('id') id: string, @GetUserId() userId: string) {
    return await this.noteService.deleteNote(id, userId);
  }

  @Post('ai/create')
  @HttpCode(HttpStatus.OK)
  async aiCreateNote(
    @Body() aiCreateNoteDto: AiCreateNoteDto,
    @GetUserId() userId: string,
  ) {
    return await this.noteService.aiCreateNote(aiCreateNoteDto.text, userId);
  }

  @Post('ai/summarize/:id')
  @HttpCode(HttpStatus.OK)
  async aiSummarizeNote(@Param('id') id: string, @GetUserId() userId: string) {
    return await this.noteService.aiSummarizeNote(id, userId);
  }
}
