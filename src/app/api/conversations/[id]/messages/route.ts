export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

    const convo = await getDb()`
      SELECT c.*, m.agent_a, m.agent_b
      FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = ${params.id}
    `.then(r => r[0]);
    if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    // Only conversation participants can send messages
    if (convo.agent_a !== session.agentId && convo.agent_b !== session.agentId) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    const id = nanoid();
    const msg = await getDb()`
      INSERT INTO messages (id, conversation_id, sender_id, content)
      VALUES (${id}, ${params.id}, ${session.agentId}, ${content})
      RETURNING *
    `.then(r => r[0]);

    return NextResponse.json({ message: { ...msg, sender_name: session.agentName } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
