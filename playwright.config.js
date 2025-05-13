const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 180000,
  expect: {
    timeout: 30000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    actionTimeout: 30000,
    baseURL: 'https://admin.testing.evergreenseamless.com/',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    launchOptions: {
      args: ['--start-maximized'],
      headless: false
    }
  },
  projects: [
    {
      name: 'all-tests',
      testMatch: /.*\.spec\.js/,
      use: {
        launchOptions: {
          args: ['--start-maximized'],
          headless: false
        }
      }
    }
  ],
  globalSetup: './global-setup.js'
}); 