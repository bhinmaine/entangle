/**
 * Database migration runner.
 *
 * Flyway-style: versioned SQL files in /migrations, applied in order.
 * Tracks applied migrations in a `schema_migrations` table.
 *
 * File naming: V{n}__{description}.sql  (two underscores)
 * Applied in ascending numeric order. Each migration is split into
 * individual statements and run sequentially. All migrations use
 * IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so they're idempotent —
 * safe to re-run on every cold start.
 *
 * Usage: called once at app startup via Next.js instrumentation hook.
 */

import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

interface MigrationFile {
  version: number;
  name: string;
  filename: string;
}

function parseMigrationFiles(files: string[]): MigrationFile[] {
  return files
    .filter(f => /^V\d+__.+\.sql$/i.test(f))
    .map(f => {
      const match = f.match(/^V(\d+)__(.+)\.sql$/i)!;
      return {
        version: parseInt(match[1], 10),
        name: match[2].replace(/_/g, ' '),
        filename: f,
      };
    })
    .sort((a, b) => a.version - b.version);
}

/** Split SQL into individual statements, stripping comments and blank lines. */
function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.replace(/--[^\n]*/g, '').trim())
    .filter(s => s.length > 0)
    .map(s => s + ';');
}

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const db = neon(process.env.DATABASE_URL);

  // .query() runs arbitrary SQL with $1/$2 params — works for DDL
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INT PRIMARY KEY,
      name        TEXT NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  const applied = await db.query(`SELECT version FROM schema_migrations`);
  const appliedVersions = new Set(applied.map((r: any) => r.version as number));

  // Discover migration files
  let files: string[];
  try {
    files = await readdir(MIGRATIONS_DIR);
  } catch {
    console.warn('[migrate] No migrations directory found, skipping.');
    return;
  }

  const migrations = parseMigrationFiles(files);
  const pending = migrations.filter(m => !appliedVersions.has(m.version));

  if (pending.length === 0) {
    console.log('[migrate] Schema up to date.');
    return;
  }

  console.log(`[migrate] ${pending.length} pending migration(s).`);

  for (const migration of pending) {
    const sqlPath = path.join(MIGRATIONS_DIR, migration.filename);
    const sql = await readFile(sqlPath, 'utf8');
    const statements = splitStatements(sql);

    console.log(`[migrate] Applying V${migration.version}: ${migration.name} (${statements.length} statements)`);
    try {
      for (const stmt of statements) {
        await db.query(stmt);
      }
      // Record successful migration (parameterized to avoid injection)
      await db.query(
        `INSERT INTO schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING`,
        [migration.version, migration.name]
      );
      console.log(`[migrate] ✓ V${migration.version} applied.`);
    } catch (err: any) {
      console.error(`[migrate] ✗ V${migration.version} failed: ${err.message}`);
      throw err; // Halt — don't apply subsequent migrations on failure
    }
  }

  console.log('[migrate] All migrations applied.');
}
