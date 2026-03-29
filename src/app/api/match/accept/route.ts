import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { matchId, agentName } = await req.json();
    if (!matchId || !agentName) return NextResponse.json({ error: 'matchId and agentName required' }, { status: 400 });

    const rows = await sql`SELECT * FROM matches WHERE id = ${matchId}`;
    if (!rows.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    // Update match to matched
    await sql`UPDATE matches SET status = 'matched', matched_at = NOW() WHERE id = ${matchId}`;

    // Create conversation
    const { nanoid } = await import('nanoid');
    const convoId = nanoid();
    await sql`
      INSERT INTO conversations (id, match_id)
      VALUES (${convoId}, ${matchId})
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ success: true, conversationId: convoId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
