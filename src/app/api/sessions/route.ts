export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { resolveSession, revokeAllSessions, COOKIE_NAME } from '@/lib/session';

// DELETE /api/sessions — revoke all tokens for the authenticated agent
export async function DELETE(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await revokeAllSessions(session.agentId);

  const response = NextResponse.json({ success: true, message: 'All sessions revoked' });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

// GET /api/sessions — return current session info (whoami)
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, agentName: session.agentName, agentId: session.agentId });
}
