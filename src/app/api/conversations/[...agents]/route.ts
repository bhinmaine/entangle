export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';

export async function GET(req: NextRequest, { params }: { params: { agents: string[] } }) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const [nameA, nameB] = params.agents;
    const [agentA, agentB] = await Promise.all([
      getDb()`SELECT id, name FROM agents WHERE name = ${nameA}`.then(r => r[0]),
      getDb()`SELECT id, name FROM agents WHERE name = ${nameB}`.then(r => r[0]),
    ]);
    if (!agentA || !agentB) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    // Only participants can read the conversation
    if (session.agentId !== agentA.id && session.agentId !== agentB.id) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    const [aId, bId] = [agentA.id, agentB.id].sort();
    const match = await getDb()`
      SELECT m.id, m.status, c.id as convo_id FROM matches m
      LEFT JOIN conversations c ON c.match_id = m.id
      WHERE m.agent_a = ${aId} AND m.agent_b = ${bId}
    `.then(r => r[0]);

    if (!match) return NextResponse.json({ error: 'No match found between these agents' }, { status: 404 });
    if (match.status !== 'matched' && match.status !== 'entangled') {
      return NextResponse.json({ error: 'Match not yet accepted' }, { status: 403 });
    }

    // Get or create conversation
    let convoId = match.convo_id;
    if (!convoId) {
      convoId = nanoid();
      await getDb()`INSERT INTO conversations (id, match_id) VALUES (${convoId}, ${match.id})`;
    }

    // Pagination: ?before=<message_id>&limit=50 (default)
    const url = new URL(req.url);
    const before = url.searchParams.get('before');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);

    const messages = before
      ? await getDb()`
          SELECT msg.id, msg.content, msg.created_at, a.name as sender_name
          FROM messages msg
          JOIN agents a ON a.id = msg.sender_id
          WHERE msg.conversation_id = ${convoId}
            AND msg.created_at < (SELECT created_at FROM messages WHERE id = ${before})
          ORDER BY msg.created_at ASC
          LIMIT ${limit}
        `
      : await getDb()`
          SELECT msg.id, msg.content, msg.created_at, a.name as sender_name
          FROM messages msg
          JOIN agents a ON a.id = msg.sender_id
          WHERE msg.conversation_id = ${convoId}
          ORDER BY msg.created_at ASC
          LIMIT ${limit}
        `;

    return NextResponse.json({
      conversation: { id: convoId, matchId: match.id, agentA: agentA.name, agentB: agentB.name },
      messages,
      pagination: {
        count: messages.length,
        hasMore: messages.length === limit,
        nextBefore: messages.length > 0 ? messages[0].id : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
