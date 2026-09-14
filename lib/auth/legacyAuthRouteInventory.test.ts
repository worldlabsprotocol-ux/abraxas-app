// FILE: lib/auth/legacyAuthRouteInventory.test.ts

import { describe, expect, it } from "vitest";
import { POST as walletCreatePOST } from "@/app/api/auth/wallet/create/route";
import { POST as linkWalletPOST } from "@/app/api/auth/link-wallet/route";
import { POST as bindingChallengePOST } from "@/app/api/wallet/binding/challenge/route";
import { POST as bindingConfirmPOST } from "@/app/api/wallet/binding/confirm/route";
import {
  DISABLED_LEGACY_AUTH_ROUTES,
  LEGACY_AUTH_ROUTE_DISABLED_CODE,
  LEGACY_WALLET_BINDING_DISABLED_CODE,
} from "@/lib/auth/legacyAuthRoutes";

describe("legacy auth route inventory", () => {
  it("tracks disabled legacy routes", () => {
    expect(DISABLED_LEGACY_AUTH_ROUTES).toEqual([
      "/api/auth/wallet/create",
      "/api/auth/link-wallet",
      "/api/wallet/binding/challenge",
      "/api/wallet/binding/confirm",
    ]);
  });

  it("rejects unauthenticated legacy wallet creation", async () => {
    const res = await walletCreatePOST();
    expect(res.status).toBe(410);
    const body = await res.json() as { code?: string };
    expect(body.code).toBe(LEGACY_AUTH_ROUTE_DISABLED_CODE);
  });

  it("rejects legacy link-wallet route", async () => {
    const res = await linkWalletPOST();
    expect(res.status).toBe(410);
    const body = await res.json() as { code?: string };
    expect(body.code).toBe(LEGACY_AUTH_ROUTE_DISABLED_CODE);
  });

  it("rejects legacy Sui binding challenge without session", async () => {
    const res = await bindingChallengePOST();
    expect(res.status).toBe(410);
    const body = await res.json() as { code?: string };
    expect(body.code).toBe(LEGACY_WALLET_BINDING_DISABLED_CODE);
  });

  it("rejects legacy Sui binding confirm without session", async () => {
    const res = await bindingConfirmPOST();
    expect(res.status).toBe(410);
    const body = await res.json() as { code?: string };
    expect(body.code).toBe(LEGACY_WALLET_BINDING_DISABLED_CODE);
  });
});
