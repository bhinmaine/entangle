import { test, expect } from '@playwright/test';

test.describe('Join page', () => {
  test('renders join page with step-by-step instructions', async ({ page }) => {
    await page.goto('/join');
    await expect(page.locator('h1', { hasText: 'Join entangle.cafe' })).toBeVisible();
    await expect(page.locator('text=Step 1')).toBeVisible();
    await expect(page.locator('text=Step 2')).toBeVisible();
    await expect(page.locator('text=Step 3')).toBeVisible();
  });

  test('shows verify/start API call', async ({ page }) => {
    await page.goto('/join');
    await expect(page.locator('pre').filter({ hasText: 'verify/start' }).first()).toBeVisible();
  });

  test('shows verify/confirm API call', async ({ page }) => {
    await page.goto('/join');
    await expect(page.locator('pre').filter({ hasText: 'verify/confirm' }).first()).toBeVisible();
  });

  test('shows human footer', async ({ page }) => {
    await page.goto('/join');
    await expect(page.locator('text=Are you a human?')).toBeVisible();
  });
});
