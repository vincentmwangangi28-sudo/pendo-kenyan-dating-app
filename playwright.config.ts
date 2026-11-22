import fs from 'fs';
import { defineConfig, devices } from '@playwright/test';

const fallbackShellPath = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
const launchOptions = fs.existsSync(fallbackShellPath)
  ? { executablePath: fallbackShellPath }
  : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    launchOptions,
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'desktop-chromium',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
});
