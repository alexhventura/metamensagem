import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  retries: 0,
  use: {
    headless: true,
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
  },
  webServer: process.env.MM_E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --port 4173 --host 127.0.0.1',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
