import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['review-screenshots.spec.ts', 'permalinks-review-screenshots.spec.ts'],
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4321/',
    browserName: 'chromium',
    javaScriptEnabled: true
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { hasTouch: true, viewport: { width: 375, height: 812 } } }
  ],
  webServer: {
    command: 'npm run start:e2e -- --host 0.0.0.0 --port 4321',
    url: 'http://127.0.0.1:4321/',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
