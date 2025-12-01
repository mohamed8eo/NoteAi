import { text, timestamp, uuid, pgTable, varchar } from 'drizzle-orm/pg-core';
import { title } from 'process';

export const Users = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  refreshToken: varchar('refresh_token', { length: 255 }).notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const Notes = pgTable('note', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title').notNull(),
  content: text('content').notNull().default(''),
  userId: uuid('user_id')
    .notNull()
    .references(() => Users.id, { onDelete: 'cascade' }),
  summarize: text('summarize').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
