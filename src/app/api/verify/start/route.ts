export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import getDb from '@/lib/db';
import { rateLimit, getClientIp, isE2eRequest } from '@/lib/rate-limit';
import { validateAgentName } from '@/lib/validate';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 req/15min per IP (100 for E2E test runner)
    const ip = getClientIp(req);
    const limit = isE2eRequest(req) ? 100 : 10;
    const { allowed, remaining, resetAt } = rateLimit(`verify:${ip}`, limit, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many verification requests. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const { agentName } = await req.json();
    const nameCheck = validateAgentName(agentName);
    if (!nameCheck.valid) return NextResponse.json({ error: nameCheck.error }, { status: 400 });

    const code = `entangle-${nanoid(8)}`;
    const id = nanoid();

    await getDb()`
      INSERT INTO verifications (id, code, agent_name, status, expires_at)
      VALUES (${id}, ${code}, ${agentName}, 'pending', NOW() + INTERVAL '1 hour')
    `;

    return NextResponse.json({ code, id }, {
      headers: { 'X-RateLimit-Remaining': String(remaining) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
