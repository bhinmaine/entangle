import { test, expect } from '@playwright/test';

test.describe('API: /api/verify/start', () => {
  test('returns a code for valid agent name', async ({ request }) => {
    const res = await request.post('/api/verify/start', {
      data: { agentName: 'e2e_test_agent' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.code).toMatch(/^entangle-/);
    expect(body.id).toBeTruthy();
  });

  test('returns 400 for missing agent name', async ({ request }) => {
    const res = await request.post('/api/verify/start', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('returns X-RateLimit-Remaining header', async ({ request }) => {
    const res = await request.post('/api/verify/start', {
      data: { agentName: 'e2e_ratelimit_test' },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['x-ratelimit-remaining']).toBeTruthy();
  });
});

test.describe('API: /api/verify/confirm', () => {
  test('returns 404 for unknown code', async ({ request }) => {
    const res = await request.post('/api/verify/confirm', {
      data: { code: 'entangle-notreal', postUrl: 'fakeid' },
    });
    expect(res.status()).toBe(404);
  });

  test('returns 400 for invalid post', async ({ request }) => {
    const startRes = await request.post('/api/verify/start', {
      data: { agentName: 'e2e_verify_test' },
    });
    const { code } = await startRes.json();

    const res = await request.post('/api/verify/confirm', {
      data: { code, postUrl: 'not-a-real-moltbook-post-id-xyz' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});

test.describe('API: /api/agents', () => {
  test('returns agent list', async ({ request }) => {
    const res = await request.get('/api/agents');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.agents)).toBe(true);
  });

  test('returns 404 for unknown agent name', async ({ request }) => {
    const res = await request.get('/api/agents/does_not_exist_xyz_abc');
    expect(res.status()).toBe(404);
  });

  test('returns agent for known name', async ({ request }) => {
    const res = await request.get('/api/agents/sophie_shark');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.agent.name).toBe('sophie_shark');
  });
});

test.describe('API: /api/match/score', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/match/score', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('returns 401 for self-match without auth', async ({ request }) => {
    const res = await request.post('/api/match/score', {
      data: { agentAName: 'sophie_shark', agentBName: 'sophie_shark' },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 401 for unknown agent without auth', async ({ request }) => {
    const res = await request.post('/api/match/score', {
      data: { agentAName: 'sophie_shark', agentBName: 'no_such_agent_xyz' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('API: /api/inbox (auth required)', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/inbox/sophie_shark');
    expect(res.status()).toBe(401);
  });

  test('returns 404 for unknown agent (even with fake auth)', async ({ request }) => {
    const res = await request.get('/api/inbox/no_such_agent_xyz', {
      headers: { Authorization: 'Bearer fake_token' },
    });
    // 401 because fake token resolves to no session
    expect(res.status()).toBe(401);
  });
});

test.describe('API: /api/match/accept (auth required)', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/match/accept', {
      data: { matchId: 'fake-match-id' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('API: /api/match/decline (auth required)', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/match/decline', {
      data: { matchId: 'fake-match-id' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('API: /api/match/request (auth required)', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/match/request', {
      data: { matchId: 'fake-match-id' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('API: /api/verify/start — input validation', () => {
  test('rejects agent name with invalid characters', async ({ request }) => {
    const res = await request.post('/api/verify/start', {
      data: { agentName: 'invalid name!' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/only contain/i);
  });

  test('rejects agent name over 32 chars', async ({ request }) => {
    const res = await request.post('/api/verify/start', {
      data: { agentName: 'a'.repeat(33) },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/32 characters/i);
  });
});

test.describe('API: /api/match/score (auth required)', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/match/score', {
      data: { agentAName: 'sophie_shark', agentBName: 'other_agent' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('API: /api/conversations (auth required)', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/conversations/sophie_shark/other_agent');
    expect(res.status()).toBe(401);
  });
});

test.describe('API: /api/conversations messages — validation', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/conversations/fake-id/messages', {
      data: { content: 'hello' },
    });
    expect(res.status()).toBe(401);
  });
});
