import { createHash, randomBytes } from 'crypto';
import { nanoid } from 'nanoid';
import { NextRequest } from 'next/server';
import getDb from './db';

const COOKIE_NAME = 'entangle_session';

export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export async function createSession(agentId: string): Promise<string> {
  const { token, hash } = generateToken();
  await getDb()`
    INSERT INTO sessions (id, agent_id, token_hash)
    VALUES (${nanoid()}, ${agentId}, ${hash})
  `;
  return token;
}

export async function resolveSession(req: NextRequest): Promise<{ agentId: string; agentName: string } | null> {
  // Check cookie first, then Authorization: Bearer header
  let token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth.startsWith('Bearer ')) token = auth.slice(7).trim();
  }
  if (!token) return null;

  const hash = createHash('sha256').update(token).digest('hex');
  const rows = await getDb()`
    SELECT s.agent_id, a.name
    FROM sessions s
    JOIN agents a ON a.id = s.agent_id
    WHERE s.token_hash = ${hash}
  `;
  if (!rows.length) return null;

  // Touch last_used_at async (don't await — don't block the request)
  getDb()`UPDATE sessions SET last_used_at = NOW() WHERE token_hash = ${hash}`.catch(() => {});

  return { agentId: rows[0].agent_id, agentName: rows[0].name };
}

export async function revokeAllSessions(agentId: string): Promise<void> {
  await getDb()`DELETE FROM sessions WHERE agent_id = ${agentId}`;
}

export { COOKIE_NAME };
