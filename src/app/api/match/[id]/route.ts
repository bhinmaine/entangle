export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';

// DELETE /api/match/[id] — disconnect from a match
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const rows = await getDb()`SELECT * FROM matches WHERE id = ${params.id}`;
    if (!rows.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    const match = rows[0];

    if (match.agent_a !== session.agentId && match.agent_b !== session.agentId) {
      return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
    }

    // Soft delete: mark disconnected rather than hard delete
    // Preserves conversation history; both agents can re-request later
    await getDb()`
      UPDATE matches SET status = 'disconnected' WHERE id = ${params.id}
    `;

    return NextResponse.json({ success: true, status: 'disconnected' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/match/[id] — fetch a single match record
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const rows = await getDb()`
      SELECT m.id, m.status, m.score, m.created_at, m.matched_at,
        aa.name as agent_a_name, ab.name as agent_b_name,
        initiator.name as initiated_by_name
      FROM matches m
      JOIN agents aa ON aa.id = m.agent_a
      JOIN agents ab ON ab.id = m.agent_b
      JOIN agents initiator ON initiator.id = m.initiated_by
      WHERE m.id = ${params.id}
    `;
    if (!rows.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    const match = rows[0];

    if (session.agentName !== match.agent_a_name && session.agentName !== match.agent_b_name) {
      return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
    }

    return NextResponse.json({ match });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
