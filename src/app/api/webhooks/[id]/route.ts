export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';

// DELETE /api/webhooks/[id] — remove a webhook
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const rows = await getDb()`SELECT * FROM webhooks WHERE id = ${params.id}`;
    if (!rows.length) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    if (rows[0].agent_id !== session.agentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await getDb()`DELETE FROM webhooks WHERE id = ${params.id}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
