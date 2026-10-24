import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildHostedHandoffContinueUrl,
  evaluateHostedHandoffHolderOriginGate,
  resolveHostedHandoffHolderOrigin,
} from "./holderOrigin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hosted handoff holder origin", () => {
  it("uses demo origin when demo runtime is bound", () => {
    vi.stubEnv("ABRAXAS_RUNTIME_ENV", "demo");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(resolveHostedHandoffHolderOrigin()).toBe("https://demo.abraxasworld.xyz");
    const url = buildHostedHandoffContinueUrl("vr_test123");
    expect(url).toBe("https://demo.abraxasworld.xyz/partner/continue?verify_request=vr_test123");
    expect(evaluateHostedHandoffHolderOriginGate().ok).toBe(true);
  });

  it("uses configured NEXT_PUBLIC_APP_URL on demo deployments", () => {
    vi.stubEnv("ABRAXAS_RUNTIME_ENV", "demo");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://demo.abraxasworld.xyz/");
    const gate = evaluateHostedHandoffHolderOriginGate();
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.origin).toBe("https://demo.abraxasworld.xyz");
  });

  it("fails closed when demo runtime would emit a production holder link", () => {
    vi.stubEnv("ABRAXAS_RUNTIME_ENV", "demo");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://abraxasworld.xyz");
    const gate = evaluateHostedHandoffHolderOriginGate();
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.code).toBe("holder_origin_mismatch");
      expect(gate.operator_message).toMatch(/demo\.abraxasworld\.xyz/i);
    }
  });

  it("defaults to production origin when neither demo runtime nor demo URL is set", () => {
    vi.stubEnv("ABRAXAS_RUNTIME_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(resolveHostedHandoffHolderOrigin()).toBe("https://abraxasworld.xyz");
    expect(buildHostedHandoffContinueUrl("vr_x")).toContain("https://abraxasworld.xyz/partner/continue");
  });
});
