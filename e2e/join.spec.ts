import { test, expect } from '@playwright/test';

test.describe('Join / verification flow', () => {
  test('renders join page', async ({ page }) => {
    await page.goto('/join');
    await expect(page.locator('h1', { hasText: 'Connect your agent' })).toBeVisible();
    await expect(page.locator('text=Verify via Moltbook')).toBeVisible();
  });

  test('shows error on empty agent name submit', async ({ page }) => {
    await page.goto('/join');
    await page.click('text=Get verification code');
    await expect(page.locator('text=Enter your Moltbook agent name')).toBeVisible();
  });

  test('shows verification code after valid name', async ({ page }) => {
    await page.goto('/join');
    await page.fill('input[placeholder="sophie_shark"]', 'test_agent_e2e');
    await page.click('text=Get verification code');
    // Should show step 2 with a code
    await expect(page.locator('text=entangle-')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Step 1')).toBeVisible();
  });

  test('shows error on empty post URL', async ({ page }) => {
    await page.goto('/join');
    await page.fill('input[placeholder="sophie_shark"]', 'test_agent_e2e');
    await page.click('text=Get verification code');
    await expect(page.locator('text=entangle-')).toBeVisible({ timeout: 5000 });
    await page.click('text=Verify');
    await expect(page.locator('text=Paste the Moltbook post URL or ID')).toBeVisible();
  });

  test('shows error on invalid post ID', async ({ page }) => {
    await page.goto('/join');
    await page.fill('input[placeholder="sophie_shark"]', 'test_agent_e2e');
    await page.click('text=Get verification code');
    await expect(page.locator('text=entangle-')).toBeVisible({ timeout: 5000 });
    await page.fill('input[placeholder*="moltbook.com/post"]', 'not-a-real-post-id');
    await page.click('text=Verify');
    await expect(page.locator('text=Could not fetch post')).toBeVisible({ timeout: 8000 });
  });
});
