export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import getDb from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // 10 requests per IP per 15 minutes
    const ip = getClientIp(req);
    const { allowed, remaining, resetAt } = rateLimit(`verify:${ip}`, 10, 15 * 60 * 1000);
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
    if (!agentName) return NextResponse.json({ error: 'agentName required' }, { status: 400 });

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
