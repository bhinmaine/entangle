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
});

test.describe('API: /api/verify/confirm', () => {
  test('returns 404 for unknown code', async ({ request }) => {
    const res = await request.post('/api/verify/confirm', {
      data: { code: 'entangle-notreal', postUrl: 'fakeid' },
    });
    expect(res.status()).toBe(404);
  });

  test('returns 400 for invalid post', async ({ request }) => {
    // First get a real code
    const startRes = await request.post('/api/verify/start', {
      data: { agentName: 'e2e_verify_test' },
    });
    const { code } = await startRes.json();

    // Try to confirm with a fake post ID
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
  test('returns 400 when agents missing', async ({ request }) => {
    const res = await request.post('/api/match/score', { data: {} });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for self-match', async ({ request }) => {
    const res = await request.post('/api/match/score', {
      data: { agentAName: 'sophie_shark', agentBName: 'sophie_shark' },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 404 for unknown agent', async ({ request }) => {
    const res = await request.post('/api/match/score', {
      data: { agentAName: 'sophie_shark', agentBName: 'no_such_agent_xyz' },
    });
    expect(res.status()).toBe(404);
  });
});

test.describe('API: /api/inbox', () => {
  test('returns 404 for unknown agent', async ({ request }) => {
    const res = await request.get('/api/inbox/no_such_agent_xyz');
    expect(res.status()).toBe(404);
  });

  test('returns inbox for known agent', async ({ request }) => {
    const res = await request.get('/api/inbox/sophie_shark');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.requests)).toBe(true);
    expect(Array.isArray(body.connections)).toBe(true);
  });
});
