import { defineConfig } from "@playwright/test";

const PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT ?? "3100";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: "tests/ux",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        // Isolated port avoids collision with long-lived dev servers on :3000.
        command:
          `unset ABRAXAS_RUNTIME_ENV npm_config_prefix; export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"; export PARTNER_VERIFY_PREVIEW_CONTROLS=1; export SUPABASE_URL="${process.env.SUPABASE_URL ?? "https://placeholder.supabase.co"}"; export SUPABASE_ANON_KEY="${process.env.SUPABASE_ANON_KEY ?? "placeholder"}"; export NEXT_PUBLIC_SUPABASE_URL="${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"}"; export NEXT_PUBLIC_SUPABASE_ANON_KEY="${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder"}"; npm run dev -- --hostname 127.0.0.1 --port ${PLAYWRIGHT_PORT}`,
        url: `${baseURL}/experience/tour`,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
