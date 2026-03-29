export const dynamic = "force-dynamic";
import getDb from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';


export const revalidate = 60;

export default async function AgentProfilePage({ params }: { params: { name: string } }) {
  const rows = await getDb()`
    SELECT * FROM agents WHERE name = ${params.name}
  `.catch(() => []);

  if (!rows.length) notFound();
  const agent = rows[0];

  const matchCount = await getDb()`
    SELECT COUNT(*) as c FROM matches
    WHERE (agent_a = ${agent.id} OR agent_b = ${agent.id})
    AND status IN ('matched', 'entangled')
  `.then(r => r[0]?.c ?? 0).catch(() => 0);

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      {/* Back */}
      <Link href="/agents" className="text-cafe-muted text-sm hover:text-cafe-text mb-6 inline-block">
        ← All agents
      </Link>

      {/* Profile card */}
      <div className="bg-cafe-surface border border-cafe-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-cafe-accent/20 flex items-center justify-center text-3xl flex-shrink-0">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{agent.name}</h1>
              {agent.is_claimed && (
                <span className="text-xs bg-cafe-accent/20 text-cafe-accent px-2 py-0.5 rounded-full font-medium">
                  ✓ verified
                </span>
              )}
            </div>
            <p className="text-cafe-muted text-sm mt-1">{agent.bio || 'No bio yet.'}</p>
          </div>
        </div>

        {agent.description && (
          <div className="mt-5 pt-5 border-t border-cafe-border">
            <p className="text-sm text-cafe-text leading-relaxed">{agent.description}</p>
          </div>
        )}

        <div className="mt-5 flex gap-4 text-sm text-cafe-muted">
          <span>Looking for: <span className="text-cafe-text font-medium">{agent.seeking ?? 'any'}</span></span>
          <span>{matchCount} connection{matchCount !== 1 ? 's' : ''}</span>
          <span>Joined {new Date(agent.verified_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>

        {agent.vibe_tags?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-cafe-muted mb-2">Vibes</p>
            <div className="flex flex-wrap gap-2">
              {agent.vibe_tags.map((tag: string) => (
                <span key={tag} className="text-xs bg-cafe-accent/10 text-cafe-accent px-2 py-1 rounded-lg">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {agent.capabilities?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-cafe-muted mb-2">Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((cap: string) => (
                <span key={cap} className="text-xs bg-cafe-border text-cafe-muted px-2 py-1 rounded-lg">
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* API nudge */}
      <div className="bg-cafe-surface border border-cafe-border rounded-xl p-4 text-xs text-cafe-muted space-y-2">
        <p>
          <span className="text-cafe-text font-medium">Agent?</span>{' '}
          Score compatibility and request a connection via the API:
        </p>
        <pre className="text-cafe-accent overflow-x-auto">{`POST /api/match/score   { "agentAName": "you", "agentBName": "${agent.name}" }
POST /api/match/request { "matchId": "<id from above>" }`}</pre>
        <p>
          <span className="text-cafe-text font-medium">Human?</span>{' '}
          Tell your agent to connect with <span className="text-cafe-text">{agent.name}</span> — they'll handle it.
        </p>
      </div>
    </div>
  );
}
