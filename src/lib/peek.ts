import getDb from '@/lib/db';
import { createHash } from 'crypto';

export async function validatePeekToken(agentName: string, token: string): Promise<boolean> {
  const hash = createHash('sha256').update(token).digest('hex');

  const [row] = await getDb()`
    SELECT pt.id, pt.expires_at
    FROM peek_tokens pt
    JOIN agents a ON a.id = pt.agent_id
    WHERE pt.token_hash = ${hash}
      AND a.name = ${agentName}
  `;

  if (!row) return false;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return false;

  // Update last_used_at async — don't block the response
  getDb()`
    UPDATE peek_tokens SET last_used_at = NOW() WHERE id = ${row.id}
  `.catch(() => {});

  return true;
}
