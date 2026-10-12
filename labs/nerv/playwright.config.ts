import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4321/lab/nerv/';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run start -- --host 0.0.0.0 --port 4321',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'chromium-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 }
      }
    }
  ]
});
