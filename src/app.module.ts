import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [AuthModule, NotesModule],
})
export class AppModule {}
