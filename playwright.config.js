import { defineConfig, devices } from '@playwright/test';

const SITE = process.env.SITE_URL
  || 'https://dev-d287e71c-2526-4197-ae4c-a7f2efbf7c83.hyvorblogs.io';

export default defineConfig({
  testDir: './tests',
  // The target is a live site, not a local server, so a run is only ever as
  // fast as the network. Retry once to absorb a cold Hyvor cache.
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: SITE,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
