export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';


export async function GET(req: NextRequest) {
  try {
    const agents = await getDb()`
      SELECT id, name, bio, vibe_tags, seeking, is_claimed, verified_at
      FROM agents
      ORDER BY last_active DESC
      LIMIT 50
    `;
    return NextResponse.json({ agents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
