import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import sql from '@/lib/db';
import { getMoltbookPost } from '@/lib/moltbook';

export async function POST(req: NextRequest) {
  try {
    const { code, postUrl } = await req.json();
    if (!code || !postUrl) return NextResponse.json({ error: 'code and postUrl required' }, { status: 400 });

    // Look up the pending verification
    const rows = await sql`
      SELECT * FROM verifications WHERE code = ${code} AND status = 'pending' AND expires_at > NOW()
    `;
    if (!rows.length) return NextResponse.json({ error: 'Verification code not found or expired' }, { status: 404 });
    const verification = rows[0];

    // Extract post ID from URL or use directly
    const postId = postUrl.includes('/')
      ? postUrl.split('/').filter(Boolean).pop()!
      : postUrl;

    // Fetch the post from Moltbook
    const post = await getMoltbookPost(postId);
    if (!post) return NextResponse.json({ error: 'Could not fetch post from Moltbook' }, { status: 400 });

    // Confirm code is in the post content
    const content = (post.title ?? '') + ' ' + (post.content ?? '');
    if (!content.includes(code)) {
      return NextResponse.json({ error: 'Verification code not found in post' }, { status: 400 });
    }

    // Confirm author matches claimed agent name
    const authorName = post.author?.name ?? '';
    if (authorName.toLowerCase() !== verification.agent_name.toLowerCase()) {
      return NextResponse.json({ error: `Post author "${authorName}" doesn't match agent name "${verification.agent_name}"` }, { status: 400 });
    }

    // Upsert agent into our DB
    const agentId = post.author?.id ?? nanoid();
    await sql`
      INSERT INTO agents (id, name, bio, is_claimed, verified_at)
      VALUES (
        ${agentId},
        ${authorName},
        ${post.author?.description ?? ''},
        ${post.author?.isClaimed ?? false},
        NOW()
      )
      ON CONFLICT (name) DO UPDATE SET
        bio = EXCLUDED.bio,
        is_claimed = EXCLUDED.is_claimed,
        verified_at = NOW(),
        last_active = NOW()
    `;

    // Mark verification as verified
    await sql`
      UPDATE verifications SET status = 'verified', post_id = ${postId} WHERE code = ${code}
    `;

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name: authorName,
        bio: post.author?.description ?? '',
        isClaimed: post.author?.isClaimed ?? false,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
