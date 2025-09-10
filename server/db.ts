import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// For development, you might want to use a local PostgreSQL or keep using memory storage
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Alternative: Use the existing memory storage for development
// Keep this if you are using MemStorage for now. If you fully switch to Drizzle, remove this line.
export { storage } from './storage';