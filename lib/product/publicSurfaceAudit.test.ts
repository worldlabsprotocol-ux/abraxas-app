import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";
import { PUBLIC_DEMO_ORIGIN } from "@/lib/product/publicOrigin";
import { assertDemoRuntimeBoot, evaluateDemoRuntime } from "@/lib/product/demoRuntime";
import { GET as studioGet, POST as studioPost } from "@/app/api/developers/integration-studio/route";
import { POST as venuePost } from "@/app/api/examples/trading-venue/preflight/route";
import { POST as walletChallenge } from "@/app/api/wallet-standard/challenge/route";
import { GET as launchpadSession } from "@/app/api/launchpad/auth/session/route";

const PUBLIC_PAGES = [
  "/",
  "/passport",
  "/partner/verify",
  "/partner/continue",
  "/developers",
  "/developers/integration-studio",
  "/developers/launchpad",
  "/developers/partner",
  "/docs",
  "/docs/partner-flow",
  "/docs/trading-venue",
  "/docs/trading-venue-profiles",
  "/docs/wallet-standard-binding",
  "/docs/action-control-plane",
  "/docs/portable-action-contract",
  "/docs/chain-verifiable-attestations",
  "/docs/solana-onchain-eligibility-gate",
  "/docs/evm-onchain-eligibility-gate",
  "/docs/onchain-gate-deployments",
  "/docs/chain-attestation-signer-lifecycle",
  "/docs/reclaim-private-attestations",
  "/docs/eligibility-presentation-protocol",
  "/docs/cross-chain-protocol-access",
  "/docs/selective-disclosure",
  "/docs/starter-kit",
  "/docs/production-review",
  "/docs/production-credentials",
  "/docs/policy-proposals",
  "/docs/policy-release-candidates",
  "/docs/verification-issuer-trust",
  "/docs/hosted-partner-flow-handoff",
  "/docs/receipt-lifecycle-events",
  "/docs/circle-arc-testnet",
  "/verify",
  "/good-trouble",
  "/design-partner",
  "/onboard",
  "/identity",
  "/login",
] as const;

async function demoJwt(): Promise<string> {
  return new SignJWT({ ref: DEMO_SUPABASE_PROJECT_REF })
    .setProtectedHeader({ alg: "HS256", ref: DEMO_SUPABASE_PROJECT_REF })
    .sign(new TextEncoder().encode("test-secret-for-demo-runtime-jwt"));
}

describe("public product surface contracts", () => {
  it("keeps every required public page in the app tree", () => {
    const missing = PUBLIC_PAGES.filter((path) => {
      if (path === "/") return false;
      const file = path === "/partner/verify"
        ? "app/partner/verify/page.tsx"
        : path === "/partner/continue"
          ? "app/partner/continue/page.tsx"
          : `app${path}/page.tsx`;
      try {
        readFileSync(join(process.cwd(), file), "utf8");
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });

  it("does not fail-close isolated DEMO Integration Studio boot on Vercel production", async () => {
    const jwt = await demoJwt();
    const env = {
      ABRAXAS_RUNTIME_ENV: "demo",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_APP_URL: PUBLIC_DEMO_ORIGIN,
      ABRAXAS_ISSUER_URL: PUBLIC_DEMO_ORIGIN,
      NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_SUPABASE_PROJECT_REF}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt,
      SUPABASE_SERVICE_ROLE_KEY: jwt,
    };
    expect(evaluateDemoRuntime({ env }).ok).toBe(true);
    expect(() => assertDemoRuntimeBoot(env)).not.toThrow();
    const instrumentation = readFileSync(join(process.cwd(), "instrumentation.ts"), "utf8");
    expect(instrumentation).toContain("assertDemoRuntimeBoot");
    expect(instrumentation).toContain("fail_codes");
    expect(instrumentation).not.toMatch(/eyJ|SERVICE_ROLE|private_key/);
  });

  it("returns typed public API statuses instead of unauthenticated 500s", async () => {
    const catalog = await studioGet(new NextRequest("http://localhost/api/developers/integration-studio"));
    expect(catalog.status).toBe(200);
    const create = await studioPost(new NextRequest("http://localhost/api/developers/integration-studio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ application_name: "x" }),
    }));
    expect([401, 403]).toContain(create.status);
    const venue = await venuePost(new NextRequest("http://localhost/api/examples/trading-venue/preflight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect([400, 403]).toContain(venue.status);
    const challenge = await walletChallenge(new NextRequest("http://localhost/api/wallet-standard/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect([400, 503]).toContain(challenge.status);
    const session = await launchpadSession(new NextRequest("http://localhost/api/launchpad/auth/session"));
    expect(session.status).toBe(200);
    expect((await session.json() as { authenticated?: boolean }).authenticated).toBe(false);
  });
});
