import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: 'memos.spec.ts', outputDir: 'test-results/memos-browser', retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4321', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/serve-memos-fixture.mjs', url: 'http://127.0.0.1:4321', reuseExistingServer: false },
  projects: [
    { name: 'memos-desktop-interactive', use: { browserName: 'chromium', javaScriptEnabled: true, viewport: { width: 1440, height: 900 } } },
    { name: 'memos-desktop-static', use: { browserName: 'chromium', javaScriptEnabled: false, viewport: { width: 1440, height: 900 } } },
    { name: 'memos-mobile-static', use: { browserName: 'chromium', javaScriptEnabled: false, hasTouch: true, viewport: { width: 375, height: 812 } } },
    { name: 'memos-mobile-interactive', use: { browserName: 'chromium', javaScriptEnabled: true, hasTouch: true, viewport: { width: 375, height: 812 } } }
  ]
});
