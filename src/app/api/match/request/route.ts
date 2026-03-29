export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';
import { fireWebhooks } from '@/lib/webhooks';
import { scoreCompatibility } from '@/lib/scoring';

export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    // Support both old format { matchId } and new format { targetName }
    const targetName = body.targetName;
    const legacyMatchId = body.matchId;

    if (targetName) {
      // New flow: create or update match by target agent name
      if (targetName === session.agentName) {
        return NextResponse.json({ error: 'Cannot request a match with yourself' }, { status: 400 });
      }

      const [requesterRows, targetRows] = await Promise.all([
        getDb()`SELECT * FROM agents WHERE name = ${session.agentName}`,
        getDb()`SELECT * FROM agents WHERE name = ${targetName}`,
      ]);

      if (!targetRows.length) return NextResponse.json({ error: `Agent "${targetName}" not found` }, { status: 404 });

      const requester = requesterRows[0];
      const target = targetRows[0];
      const [aId, bId] = [requester.id, target.id].sort();

      // Check for existing match
      const existing = await getDb()`SELECT * FROM matches WHERE agent_a = ${aId} AND agent_b = ${bId}`;

      if (existing.length) {
        const match = existing[0];
        if (match.status === 'matched' || match.status === 'entangled') {
          return NextResponse.json({ error: 'Already connected', matchId: match.id, status: match.status }, { status: 409 });
        }
        if (match.status === 'pending' && match.initiated_by === session.agentId) {
          return NextResponse.json({ error: 'Request already pending', matchId: match.id, status: 'pending' }, { status: 409 });
        }
        // Re-request (e.g., after rejection or disconnection)
        const score = scoreCompatibility(requester, target);
        await getDb()`
          UPDATE matches SET status = 'pending', initiated_by = ${session.agentId}, score = ${score}
          WHERE id = ${match.id}
        `;

        fireWebhooks(target.id === aId ? target.id : target.id, 'match.request', {
          matchId: match.id, from: session.agentName, score,
        }).catch(() => {});

        return NextResponse.json({ success: true, matchId: match.id, status: 'pending', score });
      }

      // Create new match
      const score = scoreCompatibility(requester, target);
      const matchId = nanoid();
      await getDb()`
        INSERT INTO matches (id, agent_a, agent_b, score, status, initiated_by)
        VALUES (${matchId}, ${aId}, ${bId}, ${score}, 'pending', ${session.agentId})
      `;

      fireWebhooks(target.id, 'match.request', {
        matchId, from: session.agentName, score,
      }).catch(() => {});

      return NextResponse.json({ success: true, matchId, status: 'pending', score });

    } else if (legacyMatchId) {
      // Legacy flow: update existing match by matchId
      const rows = await getDb()`SELECT * FROM matches WHERE id = ${legacyMatchId}`;
      if (!rows.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      const match = rows[0];

      if (match.agent_a !== session.agentId && match.agent_b !== session.agentId) {
        return NextResponse.json({ error: 'Not a participant in this match' }, { status: 403 });
      }

      if (match.status === 'matched' || match.status === 'entangled') {
        return NextResponse.json({ error: 'Already connected', matchId: match.id, status: match.status }, { status: 409 });
      }

      await getDb()`
        UPDATE matches SET status = 'pending', initiated_by = ${session.agentId}
        WHERE id = ${legacyMatchId}
      `;

      const recipientId = match.agent_a === session.agentId ? match.agent_b : match.agent_a;
      fireWebhooks(recipientId, 'match.request', {
        matchId: legacyMatchId, from: session.agentName,
      }).catch(() => {});

      return NextResponse.json({ success: true, matchId: legacyMatchId, status: 'pending' });

    } else {
      return NextResponse.json({ error: 'targetName or matchId required' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
