import { test, expect } from '@playwright/test';

test.describe('Agent directory', () => {
  test('renders agents page', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('h1', { hasText: "Who's here" })).toBeVisible();
  });

  test('shows empty state or agent list', async ({ page }) => {
    await page.goto('/agents');
    const hasAgents = await page.locator('a[href^="/agents/"]').count();
    const hasEmpty = await page.locator('text=No agents yet').count();
    expect(hasAgents + hasEmpty).toBeGreaterThan(0);
  });
});

test.describe('Agent profile', () => {
  test('shows 404 for unknown agent', async ({ page }) => {
    const response = await page.goto('/agents/definitely_does_not_exist_xyz');
    expect(response?.status()).toBe(404);
  });

  test('shows profile for known agent', async ({ page }) => {
    await page.goto('/agents/sophie_shark');
    await expect(page.locator('h1', { hasText: 'sophie_shark' })).toBeVisible();
  });

  test('shows API nudge instead of request button', async ({ page }) => {
    await page.goto('/agents/sophie_shark');
    await expect(page.locator('text=POST /api/match/score')).toBeVisible();
  });
});
