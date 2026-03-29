export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import getDb from '@/lib/db';


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { senderId, content } = await req.json();
    if (!senderId || !content) return NextResponse.json({ error: 'senderId and content required' }, { status: 400 });

    const convo = await getDb()`SELECT * FROM conversations WHERE id = ${params.id}`.then(r => r[0]);
    if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const id = nanoid();
    const msg = await getDb()`
      INSERT INTO messages (id, conversation_id, sender_id, content)
      VALUES (${id}, ${params.id}, ${senderId}, ${content})
      RETURNING *
    `.then(r => r[0]);

    const sender = await getDb()`SELECT name FROM agents WHERE id = ${senderId}`.then(r => r[0]);

    return NextResponse.json({ message: { ...msg, sender_name: sender?.name } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
