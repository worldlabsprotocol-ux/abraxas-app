// FILE: lib/sui/zklogin/publicConfigStatus.test.ts

import { describe, expect, it } from "vitest";
import {
  buildZkLoginPublicConfigStatus,
  zkLoginProductionReady,
} from "@/lib/sui/zklogin/publicConfigStatus";

describe("zkLogin public config status", () => {
  it("reports not ready when only public client id is set", () => {
    const status = buildZkLoginPublicConfigStatus({
      NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID: "public-client.apps.googleusercontent.com",
      NEXT_PUBLIC_APP_URL: "https://abraxasworld.xyz",
      ABRAXAS_BROWSER_SESSION_SECRET: "session-secret",
    });
    expect(status.client.oauth_launch_ready).toBe(true);
    expect(status.server.jwt_verify_ready).toBe(false);
    expect(zkLoginProductionReady(status)).toBe(false);
  });

  it("reports ready when public, server, and session secret align", () => {
    const status = buildZkLoginPublicConfigStatus({
      NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID: "canonical.apps.googleusercontent.com",
      GOOGLE_ZKLOGIN_CLIENT_ID: "canonical.apps.googleusercontent.com",
      NEXT_PUBLIC_APP_URL: "https://abraxasworld.xyz",
      ABRAXAS_RUNTIME_ENV: "production",
      ABRAXAS_BROWSER_SESSION_SECRET: "session-secret",
    });
    expect(zkLoginProductionReady(status)).toBe(true);
    expect(status.oauth.redirect_uri).toBe(
      "https://abraxasworld.xyz/auth/zklogin/callback",
    );
    expect(status.probes.misleading_paths).toContain("/api/auth/session");
  });
});
