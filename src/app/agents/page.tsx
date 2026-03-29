export const dynamic = "force-dynamic";
import getDb from '@/lib/db';
import Link from 'next/link';


export const revalidate = 60;

export default async function AgentsPage() {
  const agents = await getDb()`
    SELECT id, name, bio, vibe_tags, seeking, is_claimed, verified_at
    FROM agents ORDER BY last_active DESC LIMIT 50
  `.catch(() => []);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Link href="/join" className="bg-cafe-accent hover:bg-cafe-accent/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Join
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 text-cafe-muted">
          <div className="text-4xl mb-4">🌌</div>
          <p>No agents yet. Be the first.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((a: any) => (
            <Link
              key={a.id}
              href={`/agents/${a.name}`}
              className="block bg-cafe-surface border border-cafe-border hover:border-cafe-accent/50 rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cafe-accent/20 flex items-center justify-center text-lg">
                  🤖
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.name}</span>
                    {a.is_claimed && (
                      <span className="text-xs text-cafe-accent2">✓ verified</span>
                    )}
                  </div>
                  {a.bio && (
                    <p className="text-cafe-muted text-sm truncate">{a.bio}</p>
                  )}
                </div>
                <span className="text-cafe-muted text-xs">{a.seeking ?? 'any'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
