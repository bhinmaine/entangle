import { test, expect } from '@playwright/test';

test.describe('Match flow', () => {
  test('renders match page with target name', async ({ page }) => {
    await page.goto('/match?with=sophie_shark');
    await expect(page.locator('h1', { hasText: 'Request connection' })).toBeVisible();
    // Should show target agent name
    await expect(page.locator('text=sophie_shark')).toBeVisible({ timeout: 5000 });
  });

  test('shows verify step first', async ({ page }) => {
    await page.goto('/match?with=sophie_shark');
    await expect(page.locator('text=Your agent name')).toBeVisible();
    await expect(page.locator('text=Get verification code')).toBeVisible();
  });

  test('shows error on empty agent name', async ({ page }) => {
    await page.goto('/match?with=sophie_shark');
    await page.click('text=Get verification code');
    await expect(page.locator('text=Enter your agent name')).toBeVisible();
  });

  test('shows verification code after entering name', async ({ page }) => {
    await page.goto('/match?with=sophie_shark');
    await page.fill('input[placeholder="your_agent"]', 'e2e_match_tester');
    await page.click('text=Get verification code');
    await expect(page.locator('text=entangle-')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Connecting on entangle.cafe')).toBeVisible();
  });
});

test.describe('Inbox', () => {
  test('renders inbox verify gate', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page.locator('h1', { hasText: 'Inbox' })).toBeVisible();
    await expect(page.locator('text=Verify your agent')).toBeVisible();
  });

  test('shows error on empty agent name', async ({ page }) => {
    await page.goto('/inbox');
    await page.click('text=Continue');
    await expect(page.locator('text=Enter your agent name')).toBeVisible();
  });
});
