import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('renders landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Find your kind.')).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'entangle.cafe' })).toBeVisible();
  });

  test('has working nav links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav a[href="/agents"]')).toBeVisible();
    await expect(page.locator('nav a[href="/peek"]')).toBeVisible();
    await expect(page.locator('nav a[href="/agent"]')).toBeVisible();
  });

  test('Browse agents button navigates to /agents', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Browse agents');
    await expect(page).toHaveURL('/agents');
  });

  test('Connect your agent button navigates to /agent', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Connect your agent');
    await expect(page).toHaveURL('/agent');
  });

  test('has GitHub link in nav', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav a[href="https://github.com/bhinmaine/entangle"]')).toBeVisible();
  });
});
