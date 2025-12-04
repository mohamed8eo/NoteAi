/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateNoteDto } from './dto/createNote.dto';
import { db } from 'src/db';
import { Notes } from 'src/db/schema';
import { and, eq } from 'drizzle-orm';
import { UpdateNoteDto } from './dto/updateNote.dto';
import { GoogleGenAI } from '@google/genai';
import { supabaseStorage } from 'src/db/storage';

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

  // AI Image Generation and Upload
  async generateAndUploadImage(prompt: string, userId: string) {
    try {
      // Generate image using Gemini with image generation model
      // Using gemini-2.0-flash-exp or gemini-2.5-flash-image for image generation
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
        config: {
          responseMimeType: 'image/png',
        },
      });

      // Extract image data from response
      let imageData: Buffer | null = null;
      let imageBase64: string | null = null;

      // Try to extract image from response
      // The response structure may vary, so we check multiple possible formats
      const responseData = response as any;

      // Method 1: Check for inlineData in parts
      if (
        responseData.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData
      ) {
        const inlineData =
          responseData.response.candidates[0].content.parts[0].inlineData;
        if (inlineData.data && inlineData.mimeType?.startsWith('image/')) {
          imageBase64 = inlineData.data;
          imageData = Buffer.from(inlineData.data, 'base64');
        }
      }
      // Method 2: Check if response has direct image data
      else if (responseData.imageData) {
        imageBase64 = responseData.imageData;
        imageData = Buffer.from(responseData.imageData, 'base64');
      }
      // Method 3: Try to get from text response (base64 encoded)
      else {
        const textResponse = response.text || '';
        // Look for base64 image data in the response
        const base64Match = textResponse.match(
          /data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/,
        );
        if (base64Match && base64Match[1]) {
          imageBase64 = base64Match[1];
          imageData = Buffer.from(base64Match[1], 'base64');
        } else {
          // Try to find any base64 string that might be an image
          const potentialBase64 = textResponse.match(
            /([A-Za-z0-9+/]{100,}={0,2})/,
          );
          if (potentialBase64) {
            try {
              const tempBuffer = Buffer.from(potentialBase64[1], 'base64');
              // Verify it's actually image data by checking magic bytes
              if (
                tempBuffer[0] === 0x89 &&
                tempBuffer[1] === 0x50 &&
                tempBuffer[2] === 0x4e &&
                tempBuffer[3] === 0x47
              ) {
                // PNG magic bytes found
                imageBase64 = potentialBase64[1];
                imageData = tempBuffer;
              } else {
                throw new BadRequestException(
                  'Image generation failed: No valid image data received from Gemini',
                );
              }
            } catch (error) {
              if (error instanceof BadRequestException) {
                throw error;
              }
              throw new BadRequestException(
                'Image generation failed: Could not decode image data from Gemini response',
              );
            }
          } else {
            throw new BadRequestException(
              'Image generation failed: No image data found in Gemini response. The model may not support image generation, or the response format is unexpected.',
            );
          }
        }
      }

      if (!imageData || !imageBase64) {
        throw new BadRequestException(
          'Image generation failed: Could not extract image data from response',
        );
      }

      // Generate unique filename with user folder structure
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 9);
      const filename = `images/${userId}/${timestamp}-${randomString}.png`;

      // Upload to Supabase Storage
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'images';

      const { data: uploadData, error: uploadError } =
        await supabaseStorage.storage
          .from(bucketName)
          .upload(filename, imageData, {
            contentType: 'image/png',
            upsert: false,
            cacheControl: '3600',
          });

      if (uploadError) {
        throw new BadRequestException(
          `Failed to upload image to Supabase: ${uploadError.message}`,
        );
      }

      // Get public URL for the uploaded image
      const {
        data: { publicUrl },
      } = supabaseStorage.storage.from(bucketName).getPublicUrl(filename);

      return {
        success: true,
        message: 'Image generated and uploaded successfully',
        imageUrl: publicUrl,
        filename,
        uploadData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Image generation/upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
