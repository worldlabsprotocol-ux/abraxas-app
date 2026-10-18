import { describe, expect, it } from "vitest";
import { offlineCapableVerificationIds, RECEIPT_VERIFICATION_CAPABILITIES } from "./offlineVerificationContract";
import {
  listDependenciesByCategory,
  listOperationsBlockedWithoutPersistence,
  TRUST_BOUNDARY_DEPENDENCIES,
} from "./trustBoundaryInventory";
import { assessNativeAuthProductionReadiness } from "@/lib/auth/nativeAccount/productionReadiness";

describe("trustBoundaryInventory", () => {
  it("classifies native auth as auth state not crypto root", () => {
    const native = TRUST_BOUNDARY_DEPENDENCIES.find((d) => d.id === "native_account_webauthn");
    expect(native?.category).toBe("auth_authorization_state");
    expect(native?.offline_capable).toBe(false);
  });

  it("lists signature verify as offline capable", () => {
    const sig = TRUST_BOUNDARY_DEPENDENCIES.find((d) => d.id === "decision_receipt_signature_verify");
    expect(sig?.offline_capable).toBe(true);
    expect(sig?.category).toBe("cryptographic_verification");
  });

  it("includes blocked operations when persistence unavailable", () => {
    const blocked = listOperationsBlockedWithoutPersistence();
    expect(blocked).toContain("native_account_webauthn");
    expect(blocked).toContain("receipt_current_validity");
  });

  it("separates replaceable telemetry from trust roots", () => {
    const telemetry = listDependenciesByCategory("replaceable_storage");
    expect(telemetry.some((t) => t.id === "integration_telemetry")).toBe(true);
    const external = listDependenciesByCategory("external_trust_root");
    expect(external.some((t) => t.id === "google_zklogin")).toBe(true);
  });
});

describe("offlineVerificationContract", () => {
  it("never claims revocation is offline", () => {
    const offline = new Set(offlineCapableVerificationIds());
    expect(offline.has("revocation_current")).toBe(false);
    const revocation = RECEIPT_VERIFICATION_CAPABILITIES.find((c) => c.id === "revocation_current");
    expect(revocation?.mode).toBe("requires_fresh_authoritative_state");
  });
});

describe("assessNativeAuthProductionReadiness", () => {
  it("blocks production memory store", () => {
    const r = assessNativeAuthProductionReadiness({
      env: {
        NODE_ENV: "production",
        ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true",
        ABRAXAS_ACCOUNT_SESSION_SECRET: "x".repeat(32),
        ABRAXAS_NATIVE_ACCOUNT_MEMORY: "true",
      },
    });
    expect(r.blockers).toContain("memory_forbidden_in_production");
  });

  it("requires schema when enabled", () => {
    const r = assessNativeAuthProductionReadiness({
      env: {
        NODE_ENV: "production",
        ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED: "true",
        ABRAXAS_ACCOUNT_SESSION_SECRET: "x".repeat(32),
        ABRAXAS_WEBAUTHN_RP_ID: "abraxasworld.xyz",
      },
      schema: {
        ok: false,
        code: "migration_144_missing",
        migrations: { migration_144: false, migration_145_atomic_rpc: false },
      },
    });
    expect(r.blockers).toContain("migration_144_missing");
  });
});
