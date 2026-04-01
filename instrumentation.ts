/**
 * Next.js instrumentation hook — runs once at server startup.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Runs database migrations before the app starts serving requests.
 * Migrations are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS),
 * so safe to run on every cold start.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./src/lib/migrate');
    await runMigrations();
  }
}
