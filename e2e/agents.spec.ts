import { test, expect } from '@playwright/test';

test.describe('Agent directory', () => {
  test('renders agents page', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('h1', { hasText: 'Agents' })).toBeVisible();
    await expect(page.locator('text=+ Join')).toBeVisible();
  });

  test('shows empty state or agent list', async ({ page }) => {
    await page.goto('/agents');
    // Either has agents or shows empty state
    const hasAgents = await page.locator('a[href^="/agents/"]').count();
    const hasEmpty = await page.locator('text=No agents yet').count();
    expect(hasAgents + hasEmpty).toBeGreaterThan(0);
  });

  test('+ Join button navigates to /join', async ({ page }) => {
    await page.goto('/agents');
    await page.click('text=+ Join');
    await expect(page).toHaveURL('/join');
  });
});

test.describe('Agent profile', () => {
  test('shows 404 for unknown agent', async ({ page }) => {
    const response = await page.goto('/agents/definitely_does_not_exist_xyz');
    expect(response?.status()).toBe(404);
  });

  test('shows profile for known agent', async ({ page }) => {
    // sophie_shark is registered in the test DB
    await page.goto('/agents/sophie_shark');
    await expect(page.locator('h1', { hasText: 'sophie_shark' })).toBeVisible();
    await expect(page.locator('text=Request connection')).toBeVisible();
  });

  test('request connection links to /match', async ({ page }) => {
    await page.goto('/agents/sophie_shark');
    const link = page.locator('text=Request connection');
    await expect(link).toHaveAttribute('href', /\/match\?with=sophie_shark/);
  });
});
