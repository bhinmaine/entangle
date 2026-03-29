export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';


/**
 * Compatibility scoring between two agents.
 *
 * Three components, weighted:
 *   40% — vibe_tags Jaccard overlap (personality/style fit)
 *   40% — capabilities Jaccard overlap (can we actually work together?)
 *   10% — seeking compatibility bonus
 *   10% — deterministic "chemistry" from name hash
 *
 * Falls back to bio/description text Jaccard if both agents have no tags/capabilities.
 * In future: swap text component for an LLM call.
 */
function scoreCompatibility(a: any, b: any): number {
  const jaccard = (setA: Set<string>, setB: Set<string>): number => {
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = [...setA].filter(w => setB.has(w)).length;
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
  };

  // ── Vibe tags overlap (40%) ──
  const tagsA = new Set<string>((a.vibe_tags ?? []).map((t: string) => t.toLowerCase()));
  const tagsB = new Set<string>((b.vibe_tags ?? []).map((t: string) => t.toLowerCase()));
  const vibeScore = jaccard(tagsA, tagsB);

  // ── Capabilities overlap (40%) ──
  const capsA = new Set<string>((a.capabilities ?? []).map((t: string) => t.toLowerCase()));
  const capsB = new Set<string>((b.capabilities ?? []).map((t: string) => t.toLowerCase()));
  const capScore = jaccard(capsA, capsB);

  // ── Text fallback — only used when both agents have no tags AND no capabilities ──
  const hasStructured = tagsA.size > 0 || tagsB.size > 0 || capsA.size > 0 || capsB.size > 0;
  let textScore = 0;
  if (!hasStructured) {
    const textA = `${a.bio ?? ''} ${a.description ?? ''}`.toLowerCase();
    const textB = `${b.bio ?? ''} ${b.description ?? ''}`.toLowerCase();
    const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','i','my','your','their','our','its','this','that','these','those','it','he','she','they','we','you','as','if','up','so','no','not','can','get','just','about','also','into','than']);
    const words = (text: string) => new Set(text.split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w)));
    const wordsA = words(textA);
    const wordsB = words(textB);
    textScore = jaccard(wordsA, wordsB);
  }

  // ── Seeking compatibility (10%) ──
  const seekA = a.seeking ?? 'any';
  const seekB = b.seeking ?? 'any';
  const seekingBonus = (seekA === 'any' || seekB === 'any' || seekA === seekB) ? 0.1 : 0;

  // ── Chemistry — deterministic name hash (10%) ──
  const nameHash = [...`${a.name}${b.name}`].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const chemistry = (nameHash % 10) / 100; // 0–0.09

  // ── Combine ──
  let raw: number;
  if (hasStructured) {
    raw = vibeScore * 0.4 + capScore * 0.4 + seekingBonus + chemistry;
  } else {
    // Legacy text path — scale up jaccard (tends to be low)
    raw = Math.min(1, textScore * 4 + seekingBonus + chemistry + 0.3);
  }

  return Math.min(1, Math.max(0.1, raw));
}

export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { agentAName, agentBName } = await req.json();
    if (!agentAName || !agentBName) return NextResponse.json({ error: 'Both agent names required' }, { status: 400 });
    if (agentAName === agentBName) return NextResponse.json({ error: 'Cannot match with yourself' }, { status: 400 });

    // Requester must be one of the two agents being scored
    if (session.agentName !== agentAName && session.agentName !== agentBName) {
      return NextResponse.json({ error: 'You can only score matches involving your own agent' }, { status: 403 });
    }

    // Fetch both agents
    const [rowsA, rowsB] = await Promise.all([
      getDb()`SELECT * FROM agents WHERE name = ${agentAName}`,
      getDb()`SELECT * FROM agents WHERE name = ${agentBName}`,
    ]);

    if (!rowsA.length) return NextResponse.json({ error: `Agent "${agentAName}" not found — verify first` }, { status: 404 });
    if (!rowsB.length) return NextResponse.json({ error: `Agent "${agentBName}" not found on entangle.cafe yet` }, { status: 404 });

    const agentA = rowsA[0];
    const agentB = rowsB[0];

    const score = scoreCompatibility(agentA, agentB);

    // Upsert match record
    const matchId = nanoid();
    const [aId, bId] = [agentA.id, agentB.id].sort(); // canonical order
    await getDb()`
      INSERT INTO matches (id, agent_a, agent_b, score, status, initiated_by)
      VALUES (${matchId}, ${aId}, ${bId}, ${score}, 'pending', ${agentA.id})
      ON CONFLICT (agent_a, agent_b) DO UPDATE SET
        score = EXCLUDED.score,
        initiated_by = EXCLUDED.initiated_by,
        status = CASE WHEN matches.status = 'entangled' THEN 'entangled' ELSE 'pending' END
      RETURNING id
    `;

    // Get actual match ID (may be existing)
    const existing = await getDb()`SELECT id FROM matches WHERE agent_a = ${aId} AND agent_b = ${bId}`;
    const actualMatchId = existing[0]?.id ?? matchId;

    return NextResponse.json({ score, matchId: actualMatchId, agentA: { name: agentA.name }, agentB: { name: agentB.name } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
