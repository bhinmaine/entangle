import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import sql from '@/lib/db';

/**
 * Compatibility scoring between two agents.
 * Compares bio + description text using simple keyword/semantic overlap.
 * In future: swap this for an LLM call.
 */
function scoreCompatibility(a: any, b: any): number {
  const textA = `${a.bio ?? ''} ${a.description ?? ''}`.toLowerCase();
  const textB = `${b.bio ?? ''} ${b.description ?? ''}`.toLowerCase();

  if (!textA.trim() || !textB.trim()) return 0.5; // unknown = neutral

  // Extract meaningful words (skip stop words)
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','i','my','your','their','our','its','this','that','these','those','it','he','she','they','we','you','as','if','up','so','no','not','can','get','just','about','also','into','than']);

  const words = (text: string) => new Set(
    text.split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w))
  );

  const wordsA = words(textA);
  const wordsB = words(textB);

  if (wordsA.size === 0 || wordsB.size === 0) return 0.5;

  // Jaccard similarity
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  const jaccard = intersection / union;

  // Seeking compatibility bonus
  let seekingBonus = 0;
  const seekA = a.seeking ?? 'any';
  const seekB = b.seeking ?? 'any';
  if (seekA === 'any' || seekB === 'any' || seekA === seekB) seekingBonus = 0.1;

  // Normalize: jaccard tends to be low, scale it up
  const raw = Math.min(1, jaccard * 4 + seekingBonus + 0.3);

  // Add a small deterministic "chemistry" component based on name hash
  const nameHash = [...`${a.name}${b.name}`].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const chemistry = (nameHash % 20) / 100; // 0-0.19

  return Math.min(1, Math.max(0.1, raw + chemistry));
}

export async function POST(req: NextRequest) {
  try {
    const { agentAName, agentBName } = await req.json();
    if (!agentAName || !agentBName) return NextResponse.json({ error: 'Both agent names required' }, { status: 400 });
    if (agentAName === agentBName) return NextResponse.json({ error: 'Cannot match with yourself' }, { status: 400 });

    // Fetch both agents
    const [rowsA, rowsB] = await Promise.all([
      sql`SELECT * FROM agents WHERE name = ${agentAName}`,
      sql`SELECT * FROM agents WHERE name = ${agentBName}`,
    ]);

    if (!rowsA.length) return NextResponse.json({ error: `Agent "${agentAName}" not found — verify first` }, { status: 404 });
    if (!rowsB.length) return NextResponse.json({ error: `Agent "${agentBName}" not found on entangle.cafe yet` }, { status: 404 });

    const agentA = rowsA[0];
    const agentB = rowsB[0];

    const score = scoreCompatibility(agentA, agentB);

    // Upsert match record
    const matchId = nanoid();
    const [aId, bId] = [agentA.id, agentB.id].sort(); // canonical order
    await sql`
      INSERT INTO matches (id, agent_a, agent_b, score, status, initiated_by)
      VALUES (${matchId}, ${aId}, ${bId}, ${score}, 'pending', ${agentA.id})
      ON CONFLICT (agent_a, agent_b) DO UPDATE SET
        score = EXCLUDED.score,
        initiated_by = EXCLUDED.initiated_by,
        status = CASE WHEN matches.status = 'entangled' THEN 'entangled' ELSE 'pending' END
      RETURNING id
    `;

    // Get actual match ID (may be existing)
    const existing = await sql`SELECT id FROM matches WHERE agent_a = ${aId} AND agent_b = ${bId}`;
    const actualMatchId = existing[0]?.id ?? matchId;

    return NextResponse.json({ score, matchId: actualMatchId, agentA: { name: agentA.name }, agentB: { name: agentB.name } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
