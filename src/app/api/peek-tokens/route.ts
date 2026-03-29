export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/session';
import getDb from '@/lib/db';
import { createHash, randomBytes } from 'crypto';

// GET /api/peek-tokens — list tokens for authenticated agent
export async function GET(req: NextRequest) {
  const auth = await resolveSession(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tokens = await getDb()`
    SELECT id, label, created_at, expires_at, last_used_at
    FROM peek_tokens
    WHERE agent_id = ${auth.agentId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ tokens });
}

// POST /api/peek-tokens — create a new peek token
export async function POST(req: NextRequest) {
  const auth = await resolveSession(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === 'string' ? body.label.slice(0, 64) : null;
  const expiresIn = typeof body.expiresIn === 'number' ? body.expiresIn : null; // seconds

  // Max 10 peek tokens per agent
  const [{ count }] = await getDb()`
    SELECT COUNT(*)::int as count FROM peek_tokens WHERE agent_id = ${auth.agentId}
  `;
  if (count >= 10) {
    return NextResponse.json({ error: 'Maximum 10 peek tokens per agent' }, { status: 400 });
  }

  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  const id = randomBytes(8).toString('hex');
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  await getDb()`
    INSERT INTO peek_tokens (id, agent_id, token_hash, label, expires_at)
    VALUES (${id}, ${auth.agentId}, ${hash}, ${label}, ${expiresAt})
  `;

  const url = `https://entangle.cafe/peek/${auth.agentName}?token=${raw}`;

  return NextResponse.json({
    id,
    url,
    token: raw,
    label,
    expires_at: expiresAt,
    note: 'Share this URL with your human. The token is shown once — store it if needed.',
  }, { status: 201 });
}
