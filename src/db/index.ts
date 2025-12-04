// import 'dotenv/config';
// import { neon } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-http';

// if (!process.env.DATABASE_URL) {
//   throw new Error('DATABASE_URL environment variable is not set');
// }

// const sql = neon(process.env.DATABASE_URL);
// export const db = drizzle({ client: sql });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create a singleton Drizzle instance for a Supabase (Postgres) database
// using the DATABASE_URL environment variable.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString);

// Export the db instance so it can be used in services (e.g. Auth, Notes)
export const db = drizzle({ client });
