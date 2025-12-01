/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { CreateNoteDto } from './dto/createNote.dto';
import { db } from 'src/db';
import { Notes } from 'src/db/schema';
import { and, eq } from 'drizzle-orm';
import { UpdateNoteDto } from './dto/updateNote.dto';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

@Injectable()
export class NotesService {
  async createNote(createNoteDto: CreateNoteDto, userId: string) {
    const { title, content } = createNoteDto;

    const [addNote] = await db
      .insert(Notes)
      .values({
        title,
        content,
        userId,
      })
      .returning();

    return {
      message: 'Note created successfully',
      addNote,
    };
  }

  async getAllNotes(userId: string) {
    const allNotes = await db
      .select({
        id: Notes.id,
        title: Notes.title,
        content: Notes.content,
        createdAt: Notes.createdAt,
        LastUpdate: Notes.updatedAt,
      })
      .from(Notes)
      .where(eq(Notes.userId, userId));

    return {
      Notes: allNotes,
    };
  }

  async getNoteById(id: string, userId: string) {
    const [note] = await db
      .select({
        id: Notes.id,
        title: Notes.title,
        content: Notes.content,
        createdAt: Notes.createdAt,
        LastUpdate: Notes.updatedAt,
      })
      .from(Notes)
      .where(and(eq(Notes.id, id), eq(Notes.userId, userId)));

    return {
      note,
    };
  }

  async updateNote(id: string, userId: string, updateNoteDto: UpdateNoteDto) {
    await db
      .update(Notes)
      .set({
        ...updateNoteDto,
      })
      .where(and(eq(Notes.id, id), eq(Notes.userId, userId)));

    return {
      success: true,
      message: 'Note Updated Successfuly!',
    };
  }

  async deleteNote(id: string, userId: string) {
    await db
      .delete(Notes)
      .where(and(eq(Notes.id, id), eq(Notes.userId, userId)));
    return {
      success: true,
      message: 'Note Deleted Successfully!',
    };
  }

  //Ai
  async aiCreateNote(text: string, userId: string) {
    const prompt = `
You are a professional knowledge worker who drafts excellent notes.

Instructions:
- Read the user's request and silently plan the structure (no need to show the plan).
- Produce the final answer strictly as Markdown.
- The first line must be an H1 with the note title, for example: "# Git & Gitflow Overview".
- Follow the title with well-structured Markdown content (paragraphs, bullet lists, subheadings).
- Use concise, professional language.
- Output only the Markdown note. Do NOT use JSON. Do NOT wrap the response in code fences.

User request:
"""${text}"""
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const markdown = (response.text ?? '').trim();

    // Derive the title from the first Markdown header if present.
    let title = 'AI Generated Note';
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    const [addNote] = await db
      .insert(Notes)
      .values({
        title,
        content: markdown,
        userId,
      })
      .returning();

    return {
      message: 'Note created successfully',
      addNote,
    };
  }

  async aiSummarizeNote(noteId: string, userId: string) {
    const {
      note: { content },
    } = await this.getNoteById(noteId, userId);

    const prompt = `
You are a professional note summarizer.

Instructions:
- Read the provided note content carefully.
- Produce a concise Markdown summary with the following structure:
  - H2 heading "Summary".
  - 2–3 bullet points highlighting key insights.
  - (Optional) short paragraph with recommendations or next steps.
- Output only Markdown. Do NOT use JSON or code fences.

Note content:
"""${content}"""
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const summarize = (response.text ?? '').trim();

    if (summarize) {
      await db
        .update(Notes)
        .set({
          summarize,
        })
        .where(and(eq(Notes.id, noteId), eq(Notes.userId, userId)));

      return {
        success: true,
        message: 'Note summarized successfully',
        summarize,
      };
    }

    return {
      success: false,
      message: 'Note not summarized or already summarized',
    };
  }
}
