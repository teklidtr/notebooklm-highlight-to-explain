import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run sequentially since tests load Chromium extension persistently
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker since extension state is shared/persistent in the browser profile
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    headless: false, // Headless: false is required for testing Chrome extensions
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
