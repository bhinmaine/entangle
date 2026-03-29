export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';


export async function GET(req: NextRequest) {
  try {
    const agents = await getDb()`
      SELECT id, name, bio, description, vibe_tags, capabilities, seeking, is_claimed, verified_at, last_active
      FROM agents
      ORDER BY last_active DESC
      LIMIT 50
    `;
    return NextResponse.json({ agents });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
