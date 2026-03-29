export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid, customAlphabet } from 'nanoid';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';

const genSecret = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 32);

const VALID_EVENTS = new Set([
  'match.request', 'match.accept', 'match.decline', 'match.disconnect', 'message.new',
]);

// GET /api/webhooks — list your webhooks
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const hooks = await getDb()`
    SELECT id, url, events, created_at, last_fired_at
    FROM webhooks WHERE agent_id = ${session.agentId}
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ webhooks: hooks });
}

// POST /api/webhooks — register a webhook
export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { url, events } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }
    try { new URL(url); } catch {
      return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 });
    }
    if (!url.startsWith('https://')) {
      return NextResponse.json({ error: 'url must use HTTPS' }, { status: 400 });
    }

    const eventList: string[] = events ?? [...VALID_EVENTS];
    const invalid = eventList.filter((e: string) => !VALID_EVENTS.has(e));
    if (invalid.length) {
      return NextResponse.json({ error: `Invalid events: ${invalid.join(', ')}` }, { status: 400 });
    }

    // Max 5 webhooks per agent
    const count = await getDb()`SELECT COUNT(*) as n FROM webhooks WHERE agent_id = ${session.agentId}`;
    if (Number(count[0].n) >= 5) {
      return NextResponse.json({ error: 'Maximum 5 webhooks per agent' }, { status: 400 });
    }

    const secret = genSecret();
    const id = nanoid();

    await getDb()`
      INSERT INTO webhooks (id, agent_id, url, events, secret)
      VALUES (${id}, ${session.agentId}, ${url}, ${eventList}, ${secret})
      ON CONFLICT (agent_id, url) DO UPDATE SET events = EXCLUDED.events
    `;

    return NextResponse.json({
      webhook: { id, url, events: eventList },
      secret, // Only returned once — store this to verify webhook signatures
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
