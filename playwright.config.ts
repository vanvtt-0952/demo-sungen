import { defineConfig, devices } from '@playwright/test';

/**
 * Resolve the JSON reporter output path.
 *
 * Precedence:
 *   1. `PLAYWRIGHT_JSON_OUTPUT_NAME` if set — used as-is, but a `.<env>`
 *      segment is inserted before the extension when `SUNGEN_ENV` is also set
 *      so per-locale runs don't overwrite each other.
 *   2. `SUNGEN_ENV` only → `test-results/results.<env>.json`.
 *   3. Otherwise → `test-results/results.json`.
 */
function resolveJsonOutputFile(): string {
  const explicit = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME;
  const env = process.env.SUNGEN_ENV;
  if (explicit) {
    if (!env) return explicit;
    return explicit.endsWith('.json')
      ? `${explicit.slice(0, -'.json'.length)}.${env}.json`
      : `${explicit}.${env}`;
  }
  return env ? `test-results/results.${env}.json` : 'test-results/results.json';
}

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './specs/generated',
  /* Output directory for test artifacts (screenshots, videos, traces). */
  outputDir: './test-results',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  /* Global timeout per test */
  timeout: 15_000,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  /* JSON reporter is required by `sungen delivery` to populate test result columns in the exported CSV. */
  /* Output file path is controlled by PLAYWRIGHT_JSON_OUTPUT_NAME env var for per-screen isolation. */
  /* When SUNGEN_ENV is set, the env name is inserted before `.json` so locale */
  /* runs don't overwrite each other (e.g. `<name>-test-result.vi.json`). */
  reporter: [
    ['html'],
    ['json', { outputFile: resolveJsonOutputFile() }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'https://ask.awesome-services.net/',

    /* Per-action timeout (click, fill, etc.) */
    actionTimeout: 10_000,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /**
     * Capture screenshot after each test failure.
     * See https://playwright.dev/docs/api/class-testoptions#test-options-screenshot
     */
    screenshot: 'only-on-failure',

    /**
     * Record video for each test, but remove all videos from successful test runs.
     * See https://playwright.dev/docs/api/class-testoptions#test-options-video
     */
    // video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /*
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports.
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
