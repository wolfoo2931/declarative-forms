import { defineConfig, devices } from '@playwright/test';

/** Where the built documentation site is served during the docs suite. */
export const DOCS_ORIGIN = 'http://localhost:5180';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run example -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
    },
    {
      // The docs demos evaluate their own code blocks at runtime, so a broken
      // snippet only shows up in a browser. Build fresh so the suite can never
      // pass against a stale bundle.
      command: 'npm run docs:build && npx vitepress preview docs --port 5180',
      url: `${DOCS_ORIGIN}/declarative-forms/`,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'ignore',
    },
  ],
});
