import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    channel: undefined,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    launchOptions: { args: ['--no-sandbox', '--disable-dev-shm-usage'] },
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
