import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'publication.spec.ts',
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4322',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'publication-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'publication-mobile', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } }
  ],
  webServer: {
    command: 'npm run start:e2e',
    url: 'http://127.0.0.1:4322/',
    reuseExistingServer: false
  }
});
