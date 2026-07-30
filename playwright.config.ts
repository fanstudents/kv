import { defineConfig } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "zh-TW",
    timezoneId: "Asia/Taipei",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chromium",
      grep: /@visual/,
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: `npm run start -- --hostname localhost --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      AUTH_SECRET: "kv-e2e-auth-secret",
      ADMIN_PASSWORD: "kv-e2e-password",
      APP_BASE_URL: baseURL,
      OPENAI_API_KEY: "",
      LINE_CHANNEL_ID: "",
      LINE_SUPPORT_CHANNEL_ID: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      GOOGLE_REFRESH_TOKEN: "",
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      TEACHING_SUPABASE_URL: "",
      TEACHING_SUPABASE_ANON_KEY: "",
      FIRECRAWL_API_KEY: "",
    },
  },
});
