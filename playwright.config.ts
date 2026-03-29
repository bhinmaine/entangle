import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local for local runs (CI uses GitHub Actions env vars)
const envLocalPath = resolve(__dirname, '.env.local');
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    extraHTTPHeaders: process.env.E2E_RATE_LIMIT_TOKEN
      ? { 'x-e2e-token': process.env.E2E_RATE_LIMIT_TOKEN }
      : {},
  },
  // Pass e2e token for API request fixture too
  expect: { timeout: 10000 },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] }, // Chromium-based mobile, no webkit needed
    },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
