import { readFileSync } from 'fs';
import { resolve } from 'path';

export async function GET() {
  const md = readFileSync(resolve(process.cwd(), 'public/heartbeat.md'), 'utf8');
  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
