export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { resolveSession } from '@/lib/session';
import getDb from '@/lib/db';

// DELETE /api/peek-tokens/[id] — revoke a specific token
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await resolveSession(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [token] = await getDb()`
    SELECT id, agent_id FROM peek_tokens WHERE id = ${params.id}
  `;
  if (!token) return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  if (token.agent_id !== auth.agentId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await getDb()`DELETE FROM peek_tokens WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}
