import {defineConfig, devices} from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'https://www.i-am-locksmith.com';
const runsLocalServer =
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(baseURL);

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', {open: 'never'}]] : 'list',
  use: {
    baseURL,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: runsLocalServer ? {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  } :
                               undefined,
});
