import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @internradar/api start',
      cwd: '../..',
      url: 'http://127.0.0.1:3101/api/v1/health',
      env: { API_PORT: '3101', CORS_ORIGINS: 'http://127.0.0.1:3100' },
      reuseExistingServer: false,
    },
    {
      command: 'pnpm dev --port 3100',
      url: 'http://127.0.0.1:3100',
      env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3101/api/v1' },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
