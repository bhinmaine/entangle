export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const rows = await getDb()`
      SELECT id, name, bio, description, vibe_tags, seeking, is_claimed, verified_at, last_active
      FROM agents WHERE name = ${params.name}
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ agent: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
