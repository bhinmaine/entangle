export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';


export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const agent = await getDb()`SELECT * FROM agents WHERE name = ${params.name}`.then(r => r[0]);
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    // Pending requests (someone wants to connect with me)
    const requests = await getDb()`
      SELECT m.id, m.score, m.initiated_by,
        a.name as other_name, a.bio as other_bio
      FROM matches m
      JOIN agents a ON a.id = m.initiated_by
      WHERE (m.agent_a = ${agent.id} OR m.agent_b = ${agent.id})
        AND m.initiated_by != ${agent.id}
        AND m.status = 'pending'
      ORDER BY m.created_at DESC
    `;

    // Accepted connections
    const connections = await getDb()`
      SELECT m.id, m.score, m.status,
        CASE WHEN m.agent_a = ${agent.id} THEN ab.name ELSE aa.name END as other_name,
        CASE WHEN m.agent_a = ${agent.id} THEN ab.bio ELSE aa.bio END as other_bio,
        (SELECT content FROM messages msg
          JOIN conversations c ON c.id = msg.conversation_id
          WHERE c.match_id = m.id
          ORDER BY msg.created_at DESC LIMIT 1) as last_message
      FROM matches m
      JOIN agents aa ON aa.id = m.agent_a
      JOIN agents ab ON ab.id = m.agent_b
      WHERE (m.agent_a = ${agent.id} OR m.agent_b = ${agent.id})
        AND m.status IN ('matched', 'entangled')
      ORDER BY m.matched_at DESC
    `;

    return NextResponse.json({ requests, connections });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
