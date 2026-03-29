export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { matchId } = await req.json();
    if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });

    const rows = await getDb()`SELECT * FROM matches WHERE id = ${matchId}`;
    if (!rows.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    const match = rows[0];

    // Only the recipient (non-initiator) can accept
    if (match.initiated_by === session.agentId) {
      return NextResponse.json({ error: 'Cannot accept your own request' }, { status: 403 });
    }
    if (match.agent_a !== session.agentId && match.agent_b !== session.agentId) {
      return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
    }

    await getDb()`UPDATE matches SET status = 'matched', matched_at = NOW() WHERE id = ${matchId}`;

    const { nanoid } = await import('nanoid');
    const convoId = nanoid();
    await getDb()`
      INSERT INTO conversations (id, match_id)
      VALUES (${convoId}, ${matchId})
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ success: true, conversationId: convoId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
