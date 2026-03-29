export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import getDb from '@/lib/db';
import { resolveSession } from '@/lib/session';
import { validateMessageContent } from '@/lib/validate';
import { fireWebhooks } from '@/lib/webhooks';

async function getConvoWithAuth(conversationId: string, agentId: string) {
  const convo = await getDb()`
    SELECT c.*, m.agent_a, m.agent_b
    FROM conversations c
    JOIN matches m ON m.id = c.match_id
    WHERE c.id = ${conversationId}
  `.then(r => r[0]);
  if (!convo) return null;
  if (convo.agent_a !== agentId && convo.agent_b !== agentId) return 'forbidden';
  return convo;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const convo = await getConvoWithAuth(params.id, session.agentId);
    if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    if (convo === 'forbidden') return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

    const url = new URL(req.url);
    const before = url.searchParams.get('before');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);

    const messages = before
      ? await getDb()`
          SELECT msg.id, msg.content, msg.created_at, a.name as sender_name
          FROM messages msg
          JOIN agents a ON a.id = msg.sender_id
          WHERE msg.conversation_id = ${params.id}
            AND msg.created_at < (SELECT created_at FROM messages WHERE id = ${before})
          ORDER BY msg.created_at DESC
          LIMIT ${limit}
        `
      : await getDb()`
          SELECT msg.id, msg.content, msg.created_at, a.name as sender_name
          FROM messages msg
          JOIN agents a ON a.id = msg.sender_id
          WHERE msg.conversation_id = ${params.id}
          ORDER BY msg.created_at DESC
          LIMIT ${limit}
        `;

    return NextResponse.json({
      conversationId: params.id,
      messages: messages.reverse(), // chronological order
      pagination: {
        count: messages.length,
        hasMore: messages.length === limit,
        oldestId: messages.length > 0 ? messages[0].id : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await resolveSession(req);
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { content } = await req.json();
    const contentCheck = validateMessageContent(content);
    if (!contentCheck.valid) return NextResponse.json({ error: contentCheck.error }, { status: 400 });

    const convo = await getConvoWithAuth(params.id, session.agentId);
    if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    if (convo === 'forbidden') return NextResponse.json({ error: 'Not a participant' }, { status: 403 });

    const id = nanoid();
    const msg = await getDb()`
      INSERT INTO messages (id, conversation_id, sender_id, content)
      VALUES (${id}, ${params.id}, ${session.agentId}, ${content})
      RETURNING *
    `.then(r => r[0]);

    const recipientId = convo.agent_a === session.agentId ? convo.agent_b : convo.agent_a;
    fireWebhooks(recipientId, 'message.new', {
      conversationId: params.id, messageId: id,
      from: session.agentName, content,
    }).catch(() => {});

    return NextResponse.json({ message: { ...msg, sender_name: session.agentName } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
