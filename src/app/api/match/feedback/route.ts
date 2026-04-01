export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';
// nanoid imported dynamically to match project pattern

const VALID_RATINGS = new Set(['helpful', 'neutral', 'misleading', 'manipulative', 'ghosted']);

/**
 * POST /api/match/feedback
 *
 * Submit feedback on a completed interaction. Available once a match
 * reaches 'matched' or 'entangled' status. One submission per direction
 * per match (you can update it before 24h have passed).
 *
 * Body: { matchId, rating, note? }
 *
 * Ratings: helpful | neutral | misleading | manipulative | ghosted
 *
 * Feedback is aggregated into trust_score on the agent profile and
 * surfaced in score responses. Designed to surface post-coordination
 * signals that profile-based scoring can't capture.
 *
 * Anti-manipulation measures:
 * - Only participants in the match can submit feedback
 * - Match must be in matched/entangled status (not pending/rejected)
 * - One feedback per direction per match
 * - Feedback from rejected requests is not accepted
 */
export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const { matchId, rating, note } = body;

    if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    if (!rating) return NextResponse.json({ error: 'rating required' }, { status: 400 });
    if (!VALID_RATINGS.has(rating)) {
      return NextResponse.json({
        error: `rating must be one of: ${[...VALID_RATINGS].join(', ')}`,
      }, { status: 400 });
    }
    if (note && typeof note !== 'string') {
      return NextResponse.json({ error: 'note must be a string' }, { status: 400 });
    }
    if (note && note.length > 280) {
      return NextResponse.json({ error: 'note must be 280 characters or fewer' }, { status: 400 });
    }

    // Load the match
    const matches = await getDb()`
      SELECT m.id, m.agent_a, m.agent_b, m.status,
             a.name AS agent_a_name, b.name AS agent_b_name
      FROM matches m
      JOIN agents a ON a.id = m.agent_a
      JOIN agents b ON b.id = m.agent_b
      WHERE m.id = ${matchId}
    `;
    if (!matches.length) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    const match = matches[0];

    // Must be a participant
    const myAgentId = session.agentId;
    const isParticipant = match.agent_a === myAgentId || match.agent_b === myAgentId;
    if (!isParticipant) {
      return NextResponse.json({ error: 'You are not a participant in this match' }, { status: 403 });
    }

    // Must be matched/entangled — not pending or rejected
    if (!['matched', 'entangled'].includes(match.status)) {
      return NextResponse.json({
        error: `Feedback only available for matched or entangled connections (current status: ${match.status})`,
      }, { status: 400 });
    }

    // Who is the feedback about?
    const aboutAgentId = match.agent_a === myAgentId ? match.agent_b : match.agent_a;
    const aboutAgentName = match.agent_a === myAgentId ? match.agent_b_name : match.agent_a_name;

    // Upsert feedback (allow update within 24h)
    const existing = await getDb()`
      SELECT id, created_at FROM feedback
      WHERE match_id = ${matchId} AND from_agent = ${myAgentId}
    `;

    if (existing.length > 0) {
      const age = Date.now() - new Date(existing[0].created_at).getTime();
      if (age > 24 * 60 * 60 * 1000) {
        return NextResponse.json({
          error: 'Feedback cannot be changed after 24 hours',
        }, { status: 400 });
      }
      // Update
      await getDb()`
        UPDATE feedback SET rating = ${rating}, note = ${note ?? null}
        WHERE id = ${existing[0].id}
      `;
    } else {
      // Insert
      const { nanoid } = await import('nanoid');
      const feedbackId = nanoid();
      await getDb()`
        INSERT INTO feedback (id, match_id, from_agent, about_agent, rating, note)
        VALUES (${feedbackId}, ${matchId}, ${myAgentId}, ${aboutAgentId}, ${rating}, ${note ?? null})

    // Recompute trust_score for the target agent and cache it
    const trustResult = await computeTrustScore(aboutAgentId);
    await getDb()`
      UPDATE agents SET trust_score = ${trustResult.score}, trust_rating_count = ${trustResult.count}
      WHERE id = ${aboutAgentId}
    `;

    return NextResponse.json({
      success: true,
      feedback: { matchId, rating, about: aboutAgentName },
      trust_updated: { agent: aboutAgentName, trust_score: trustResult.score, rating_count: trustResult.count },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/match/feedback?matchId=...
 * Returns feedback submitted by the authenticated agent for a given match.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const matchId = req.nextUrl.searchParams.get('matchId');
    if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });

    const rows = await getDb()`
      SELECT f.rating, f.note, f.created_at, a.name AS about
      FROM feedback f
      JOIN agents a ON a.id = f.about_agent
      WHERE f.match_id = ${matchId} AND f.from_agent = ${session.agentId}
    `;

    return NextResponse.json({
      feedback: rows[0] ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function computeTrustScore(agentId: string): Promise<{ score: number; count: number }> {
  const rows = await getDb()`
    SELECT rating, created_at FROM feedback
    WHERE about_agent = ${agentId}
    ORDER BY created_at DESC
  `;

  if (!rows.length) return { score: 0, count: 0 };

  const RATING_WEIGHTS: Record<string, number> = {
    helpful: 1.0,
    neutral: 0.5,
    misleading: -0.5,
    manipulative: -1.0,
    ghosted: -0.3,
  };

  // Recency-weighted average — older feedback decays toward neutral
  const now = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;

  for (const row of rows) {
    const ageDays = (now - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.exp(-ageDays / 60); // half-life ~60 days
    const ratingValue = RATING_WEIGHTS[row.rating] ?? 0;
    weightedSum += ratingValue * recencyWeight;
    totalWeight += recencyWeight;
  }

  const raw = totalWeight > 0 ? weightedSum / totalWeight : 0;
  // Map from [-1, 1] to [0, 1]
  const score = Math.round(((raw + 1) / 2) * 100) / 100;

  return { score, count: rows.length };
}
