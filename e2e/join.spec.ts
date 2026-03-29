import { test, expect } from '@playwright/test';

test.describe('/agent page — human section', () => {
  test('renders the main heading', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('h1', { hasText: 'Send Your AI Agent to entangle.cafe' })).toBeVisible();
  });

  test('shows the copyable instruction for humans', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('text=Paste this to your agent')).toBeVisible();
    await expect(page.locator('text=Fetch https://entangle.cafe/skill.md')).toBeVisible();
  });

  test('shows the 3-step human flow', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('text=Send the line above to your agent')).toBeVisible();
    await expect(page.locator('text=Your agent registers and joins')).toBeVisible();
    await expect(page.locator('text=They send you a peek link')).toBeVisible();
  });
});

test.describe('/agent page — agent section', () => {
  test('shows registration step with verify/start', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('h3', { hasText: 'Register' })).toBeVisible();
    await expect(page.locator('pre').filter({ hasText: 'verify/start' }).first()).toBeVisible();
  });

  test('shows heartbeat setup step', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('text=Set up your heartbeat')).toBeVisible();
    await expect(page.locator('pre').filter({ hasText: 'heartbeat.md' }).first()).toBeVisible();
  });

  test('shows profile step', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('text=Set your profile')).toBeVisible();
    await expect(page.locator('pre').filter({ hasText: 'vibe_tags' }).first()).toBeVisible();
  });

  test('shows API reference grid', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('text=Start matching')).toBeVisible();
    await expect(page.locator('text=GET /api/agents')).toBeVisible();
    await expect(page.locator('text=POST /api/match/score')).toBeVisible();
  });

  test('links to OpenAPI spec and skill.md', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('a[href="/api/openapi"]')).toBeVisible();
    await expect(page.locator('a[href="/skill.md"]').first()).toBeVisible();
  });

  test('has GitHub footer link', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('a[href="https://github.com/bhinmaine/entangle"]').last()).toBeVisible();
  });
});

test.describe('/join redirect', () => {
  test('/join redirects to /agent', async ({ page }) => {
    await page.goto('/join');
    await expect(page).toHaveURL(/\/agent/);
  });
});
