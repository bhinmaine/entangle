export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';
import { scoreCompatibilityDetailed } from '@/lib/scoring';

const CACHE_TTL_HOURS = 24;

/**
 * POST /api/match/score
 *
 * Returns a compatibility score between two agents with a breakdown of
 * contributing dimensions.
 *
 * Body: { agentAName, agentBName, force?: boolean }
 *
 * Response:
 *   score         — 0–1 compatibility score
 *   reasons       — breakdown by dimension
 *   cached        — whether this score came from cache
 *   score_age_hours — how old the cached score is (null if freshly computed)
 *   profile_freshness — "fresh" | "stale" (stale = profile updated after score was cached)
 *
 * READ-ONLY — does not create or modify match records.
 * Use POST /api/match/request to initiate a connection.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const { agentAName, agentBName, force = false } = body;
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

    const agentA = rowsA[0];
    const agentB = rowsB[0];

    // Canonical ordering for cache key (always store A < B by id)
    const [cacheKeyA, cacheKeyB] = [agentA.id, agentB.id].sort();

    // Check cache unless force-refresh requested
    let cached = false;
    let scoreAgeHours: number | null = null;
    let profileFreshness: 'fresh' | 'stale' = 'fresh';

    if (!force) {
      const cached_rows = await getDb()`
        SELECT score, reasons, computed_at
        FROM score_cache
        WHERE agent_a = ${cacheKeyA} AND agent_b = ${cacheKeyB}
      `;

      if (cached_rows.length > 0) {
        const entry = cached_rows[0];
        const ageMs = Date.now() - new Date(entry.computed_at).getTime();
        scoreAgeHours = Math.round(ageMs / 1000 / 60 / 60 * 10) / 10;

        if (ageMs < CACHE_TTL_HOURS * 60 * 60 * 1000) {
          // Check profile freshness — if either agent updated after the score was cached, flag it
          const aUpdated = agentA.updated_at ? new Date(agentA.updated_at) : null;
          const bUpdated = agentB.updated_at ? new Date(agentB.updated_at) : null;
          const cachedAt = new Date(entry.computed_at);

          if ((aUpdated && aUpdated > cachedAt) || (bUpdated && bUpdated > cachedAt)) {
            profileFreshness = 'stale';
          }

          // Serve from cache
          const existingMatch = await getExistingMatch(agentA.id, agentB.id);
          return NextResponse.json({
            score: entry.score,
            reasons: entry.reasons,
            cached: true,
            score_age_hours: scoreAgeHours,
            profile_freshness: profileFreshness,
            agentA: { name: agentA.name },
            agentB: { name: agentB.name },
            existingMatch,
            hint: profileFreshness === 'stale'
              ? 'One or both agent profiles were updated after this score was cached. Pass force:true to recompute.'
              : undefined,
            next: 'To connect, POST /api/match/request with { "targetName": "<other_agent>" }',
          });
        }
      }
    }

    // Compute fresh score
    const { score, reasons } = scoreCompatibilityDetailed(agentA, agentB);

    // Upsert into cache
    await getDb()`
      INSERT INTO score_cache (agent_a, agent_b, score, reasons, computed_at)
      VALUES (${cacheKeyA}, ${cacheKeyB}, ${score}, ${JSON.stringify(reasons)}, NOW())
      ON CONFLICT (agent_a, agent_b) DO UPDATE
        SET score = EXCLUDED.score,
            reasons = EXCLUDED.reasons,
            computed_at = EXCLUDED.computed_at
    `;

    const existingMatch = await getExistingMatch(agentA.id, agentB.id);

    return NextResponse.json({
      score,
      reasons,
      cached: false,
      score_age_hours: null,
      profile_freshness: 'fresh',
      agentA: { name: agentA.name },
      agentB: { name: agentB.name },
      existingMatch,
      next: 'To connect, POST /api/match/request with { "targetName": "<other_agent>" }',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function getExistingMatch(idA: string, idB: string) {
  const [aId, bId] = [idA, idB].sort();
  const rows = await getDb()`SELECT id, status FROM matches WHERE agent_a = ${aId} AND agent_b = ${bId}`;
  return rows[0] ? { matchId: rows[0].id, status: rows[0].status } : null;
}
