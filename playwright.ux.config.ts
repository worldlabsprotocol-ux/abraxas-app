import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/ux",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        // Cloud agent injects ABRAXAS_RUNTIME_ENV=demo; local dev lacks demo Supabase binding.
        command:
          "bash -lc 'unset ABRAXAS_RUNTIME_ENV; export SUPABASE_URL=${SUPABASE_URL:-https://placeholder.supabase.co}; export SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-placeholder}; export NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co}; export NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-placeholder}; npm run dev -- --hostname 127.0.0.1 --port 3000'",
        url: "http://127.0.0.1:3000/experience/tour",
        reuseExistingServer: !process.env.PLAYWRIGHT_FORCE_WEBSERVER,
        timeout: 180_000,
      },
});
