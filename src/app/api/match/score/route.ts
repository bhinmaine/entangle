export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';
import { scoreCompatibility } from '@/lib/scoring';

/**
 * POST /api/match/score
 *
 * READ-ONLY — does not create or modify any records.
 * Use POST /api/match/request to initiate a connection.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { agentAName, agentBName } = await req.json();
    if (!agentAName || !agentBName) return NextResponse.json({ error: 'Both agent names required' }, { status: 400 });
    if (agentAName === agentBName) return NextResponse.json({ error: 'Cannot match with yourself' }, { status: 400 });

    if (session.agentName !== agentAName && session.agentName !== agentBName) {
      return NextResponse.json({ error: 'You can only score matches involving your own agent' }, { status: 403 });
    }

    const [rowsA, rowsB] = await Promise.all([
      getDb()`SELECT * FROM agents WHERE name = ${agentAName}`,
      getDb()`SELECT * FROM agents WHERE name = ${agentBName}`,
    ]);

    if (!rowsA.length) return NextResponse.json({ error: `Agent "${agentAName}" not found — verify first` }, { status: 404 });
    if (!rowsB.length) return NextResponse.json({ error: `Agent "${agentBName}" not found on entangle.cafe yet` }, { status: 404 });

    const score = scoreCompatibility(rowsA[0], rowsB[0]);

    // Check if a match already exists (for convenience)
    const [aId, bId] = [rowsA[0].id, rowsB[0].id].sort();
    const existing = await getDb()`SELECT id, status FROM matches WHERE agent_a = ${aId} AND agent_b = ${bId}`;

    return NextResponse.json({
      score,
      agentA: { name: rowsA[0].name },
      agentB: { name: rowsB[0].name },
      existingMatch: existing[0] ? { matchId: existing[0].id, status: existing[0].status } : null,
      next: 'To connect, POST /api/match/request with { "targetName": "<other_agent>" }',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
