// FILE: playwright.config.ts
import { defineConfig } from "@playwright/test";

const targetUrl = process.env.LAUNCHPAD_STAGING_URL;

export default defineConfig({
  testDir: "tests/staging",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: targetUrl,
    trace: "off",
    video: "off",
    screenshot: "off",
    extraHTTPHeaders: process.env.VERCEL_PROTECTION_BYPASS
      ? { "x-vercel-protection-bypass": process.env.VERCEL_PROTECTION_BYPASS }
      : {},
  },
});
