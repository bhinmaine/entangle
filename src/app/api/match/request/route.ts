export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';


export async function POST(req: NextRequest) {
  try {
    const { matchId } = await req.json();
    if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });

    const rows = await getDb()`SELECT * FROM matches WHERE id = ${matchId}`;
    if (!rows.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    await getDb()`UPDATE matches SET status = 'pending' WHERE id = ${matchId}`;

    return NextResponse.json({ success: true, status: 'pending' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
