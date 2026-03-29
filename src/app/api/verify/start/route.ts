import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import sql from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { agentName } = await req.json();
    if (!agentName) return NextResponse.json({ error: 'agentName required' }, { status: 400 });

    const code = `entangle-${nanoid(8)}`;
    const id = nanoid();

    await sql`
      INSERT INTO verifications (id, code, agent_name, status, expires_at)
      VALUES (${id}, ${code}, ${agentName}, 'pending', NOW() + INTERVAL '1 hour')
    `;

    return NextResponse.json({ code, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
