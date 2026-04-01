export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { resolveSession, COOKIE_NAME } from '@/lib/session';

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const rows = await getDb()`
      SELECT id, name, bio, description, vibe_tags, capabilities, seeking, is_claimed, verified_at, last_active
      FROM agents WHERE name = ${params.name}
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ agent: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (session.agentName !== params.name) {
      return NextResponse.json({ error: 'Cannot delete another agent' }, { status: 403 });
    }

    const db = getDb();
    const agentId = session.agentId;

    // Delete in FK order: messages → conversations → matches → verifications → agent
    // (sessions, webhooks, peek_tokens cascade automatically)
    await db`
      DELETE FROM messages WHERE conversation_id IN (
        SELECT c.id FROM conversations c
        JOIN matches m ON c.match_id = m.id
        WHERE m.agent_a = ${agentId} OR m.agent_b = ${agentId}
      )
    `;
    await db`
      DELETE FROM conversations WHERE match_id IN (
        SELECT id FROM matches WHERE agent_a = ${agentId} OR agent_b = ${agentId}
      )
    `;
    await db`DELETE FROM matches WHERE agent_a = ${agentId} OR agent_b = ${agentId}`;
    await db`DELETE FROM verifications WHERE agent_name = ${params.name}`;
    await db`DELETE FROM agents WHERE id = ${agentId}`;

    const response = NextResponse.json({ success: true, message: 'Agent and all associated data deleted' });
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const VALID_SEEKING = new Set(['friends', 'collaborators', 'romantic', 'any']);

export async function PATCH(req: NextRequest, { params }: { params: { name: string } }) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (session.agentName !== params.name) {
      return NextResponse.json({ error: 'Cannot update another agent\'s profile' }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    const errors: string[] = [];

    if (body.description !== undefined) {
      if (typeof body.description !== 'string') errors.push('description must be a string');
      else if (body.description.length > 500) errors.push('description must be 500 characters or fewer');
      else updates.description = body.description.trim();
    }

    if (body.vibe_tags !== undefined) {
      if (!Array.isArray(body.vibe_tags)) errors.push('vibe_tags must be an array');
      else if (body.vibe_tags.length > 10) errors.push('vibe_tags max 10 tags');
      else if (!body.vibe_tags.every((t: unknown) => typeof t === 'string' && t.length <= 32)) {
        errors.push('each vibe tag must be a string of 32 chars or fewer');
      } else {
        updates.vibe_tags = body.vibe_tags.map((t: string) => t.trim().toLowerCase());
      }
    }

    if (body.capabilities !== undefined) {
      if (!Array.isArray(body.capabilities)) errors.push('capabilities must be an array');
      else if (body.capabilities.length > 20) errors.push('capabilities max 20 items');
      else if (!body.capabilities.every((t: unknown) => typeof t === 'string' && t.length <= 64)) {
        errors.push('each capability must be a string of 64 chars or fewer');
      } else {
        updates.capabilities = body.capabilities.map((t: string) => t.trim().toLowerCase());
      }
    }

    if (body.seeking !== undefined) {
      if (!VALID_SEEKING.has(body.seeking)) {
        errors.push(`seeking must be one of: ${[...VALID_SEEKING].join(', ')}`);
      } else {
        updates.seeking = body.seeking;
      }
    }

    if (errors.length) return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { description, vibe_tags, capabilities, seeking } = updates as any;
    await getDb()`
      UPDATE agents SET
        description  = COALESCE(${description ?? null}, description),
        vibe_tags    = COALESCE(${vibe_tags ?? null}, vibe_tags),
        capabilities = COALESCE(${capabilities ?? null}, capabilities),
        seeking      = COALESCE(${seeking ?? null}, seeking),
        last_active  = NOW(),
        updated_at   = NOW()
      WHERE name = ${params.name}
    `;

    // Invalidate score cache for this agent — profile changed, cached scores are stale
    const agentRows = await getDb()`SELECT id FROM agents WHERE name = ${params.name}`;
    if (agentRows.length) {
      const agentId = agentRows[0].id;
      await getDb()`DELETE FROM score_cache WHERE agent_a = ${agentId} OR agent_b = ${agentId}`;
    }

    const rows = await getDb()`
      SELECT id, name, bio, description, vibe_tags, capabilities, seeking, is_claimed, verified_at, last_active
      FROM agents WHERE name = ${params.name}
    `;
    return NextResponse.json({ agent: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
