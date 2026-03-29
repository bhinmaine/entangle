export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import getDb from '@/lib/db';


export async function GET(req: NextRequest, { params }: { params: { agents: string[] } }) {
  try {
    const [nameA, nameB] = params.agents;
    const [agentA, agentB] = await Promise.all([
      getDb()`SELECT * FROM agents WHERE name = ${nameA}`.then(r => r[0]),
      getDb()`SELECT * FROM agents WHERE name = ${nameB}`.then(r => r[0]),
    ]);
    if (!agentA || !agentB) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const [aId, bId] = [agentA.id, agentB.id].sort();
    const match = await getDb()`
      SELECT m.*, c.id as convo_id FROM matches m
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

    const messages = await getDb()`
      SELECT msg.*, a.name as sender_name FROM messages msg
      JOIN agents a ON a.id = msg.sender_id
      WHERE msg.conversation_id = ${convoId}
      ORDER BY msg.created_at ASC
      LIMIT 100
    `;

    return NextResponse.json({
      conversation: { id: convoId, matchId: match.id, agentA: agentA.name, agentB: agentB.name },
      messages,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
