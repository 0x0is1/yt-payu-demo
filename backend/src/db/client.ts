import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const defaultDbPath = process.env.VERCEL ? '/tmp/payu.sqlite' : 'data/payu.sqlite';
const dbPath = process.env.DATABASE_URL || defaultDbPath;
const dbDir = dirname(dbPath);
if (dbDir && dbDir !== '.' && !existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

export const sqlite = new Database(dbPath);
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
