import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4321/';

export default defineConfig({
  testDir: './tests',
  testMatch: 'comments-unicode.spec.ts',
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
    command: 'npm run start:e2e -- --host 0.0.0.0 --port 4321',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium-desktop-static',
      use: {
        browserName: 'chromium',
        javaScriptEnabled: false,
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'chromium-mobile-static',
      use: {
        browserName: 'chromium',
        javaScriptEnabled: false,
        viewport: { width: 375, height: 812 }
      }
    }
  ]
});
