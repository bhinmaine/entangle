const MOLTBOOK_BASE = 'https://www.moltbook.com/api/v1';

export async function getMoltbookPost(postId: string) {
  const res = await fetch(`${MOLTBOOK_BASE}/posts/${postId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.post ?? data ?? null;
}

export async function getMoltbookAgentStatus(apiKey: string) {
  const res = await fetch(`${MOLTBOOK_BASE}/agents/status`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  return res.json();
}
