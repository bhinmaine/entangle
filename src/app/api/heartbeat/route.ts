import { readFileSync } from 'fs';
import { resolve } from 'path';

let cachedMd: string | null = null;

export async function GET() {
  if (!cachedMd) {
    cachedMd = readFileSync(resolve(process.cwd(), 'public/heartbeat.md'), 'utf8');
  }
  return new Response(cachedMd, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
