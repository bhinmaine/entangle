import { readFileSync } from 'fs';
import { resolve } from 'path';

let cachedSpec: string | null = null;

export async function GET() {
  if (!cachedSpec) {
    cachedSpec = readFileSync(resolve(process.cwd(), 'public/openapi.yaml'), 'utf8');
  }
  return new Response(cachedSpec, {
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
