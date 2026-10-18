import { defineConfig } from "@playwright/test";

const port = process.env.NATIVE_AUTH_DEV_PORT ?? "3025";
/** WebAuthn RP ID must match host — use localhost, not 127.0.0.1 */
const baseURL = process.env.NATIVE_AUTH_BASE_URL ?? `http://localhost:${port}`;
const vercelBypass = process.env.VERCEL_PROTECTION_BYPASS?.trim();
const extraHTTPHeaders = vercelBypass
  ? { "x-vercel-protection-bypass": vercelBypass }
  : undefined;

export default defineConfig({
  testDir: "tests/native-auth",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    extraHTTPHeaders,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.NATIVE_AUTH_SKIP_WEBSERVER
    ? undefined
    : {
        command: `bash -lc 'env -i PATH="$PATH" HOME="$HOME" NODE_ENV=development ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=true ABRAXAS_NATIVE_ACCOUNT_MEMORY=true ABRAXAS_ACCOUNT_SESSION_SECRET=local-native-auth-test-secret-32chars ABRAXAS_WEBAUTHN_RP_ID=localhost npm run dev -- --hostname localhost -p ${port}'`,
        url: `${baseURL}/api/auth/native/enabled`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
