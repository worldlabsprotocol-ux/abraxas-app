// FILE: lib/admin/designPartnerPromoteReadiness.test.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  copyTextToClipboard,
  evaluatePartnerIdForPromote,
  PARTNER_ID_FORMAT_VALID_COPY,
  PROMOTE_READINESS_ATTESTATION_COPY,
} from "@/lib/admin/designPartnerPromoteReadiness";

const CLIENT_BOUNDARY_FILES = [
  "lib/partner/partnerIdFormat.ts",
  "lib/admin/designPartnerPromoteReadiness.ts",
  "components/admin/DesignPartnerPromoteReadinessPanel.tsx",
  "components/admin/AdminCopyButton.tsx",
] as const;

const FORBIDDEN_IMPORT_MARKERS = [
  "@supabase",
  "partnerAuth",
  "generatePartnerKey",
  "designPartnerApplicationLifecycle",
  "from \"crypto\"",
  "from 'crypto'",
] as const;

describe("evaluatePartnerIdForPromote", () => {
  it("accepts a valid partner_id format without claiming availability", () => {
    const result = evaluatePartnerIdForPromote("acme-v1");
    expect(result.formatValid).toBe(true);
    expect(result.normalized).toBe("acme-v1");
    expect(result.message).toBe(PARTNER_ID_FORMAT_VALID_COPY);
    expect(result.message).toContain("Availability");
  });

  it("rejects invalid partner_id formats", () => {
    expect(evaluatePartnerIdForPromote("-bad").formatValid).toBe(false);
    expect(evaluatePartnerIdForPromote("").formatValid).toBe(false);
  });
});

describe("copyTextToClipboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unavailable when clipboard API is missing", async () => {
    vi.stubGlobal("navigator", {});
    await expect(copyTextToClipboard("abx_test_secret")).resolves.toBe("unavailable");
  });

  it("returns success when writeText resolves", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyTextToClipboard("abx_test_secret")).resolves.toBe("success");
    expect(writeText).toHaveBeenCalledWith("abx_test_secret");
  });

  it("returns failed when writeText rejects without logging the secret", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("abx_test_secret"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyTextToClipboard("abx_test_secret")).resolves.toBe("failed");
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("client import boundary", () => {
  it("keeps client-imported promote readiness modules free of server-only dependencies", () => {
    for (const relativePath of CLIENT_BOUNDARY_FILES) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      for (const marker of FORBIDDEN_IMPORT_MARKERS) {
        expect(source, `${relativePath} must not import ${marker}`).not.toContain(marker);
      }
    }
  });

  it("imports partner_id validation only from the shared client-safe module", () => {
    const readinessSource = readFileSync(
      resolve(process.cwd(), "lib/admin/designPartnerPromoteReadiness.ts"),
      "utf8",
    );
    expect(readinessSource).toContain("@/lib/partner/partnerIdFormat");
    expect(readinessSource).not.toContain("designPartnerApplicationLifecycle");
  });

  it("keeps the admin page on the client-safe promote readiness import chain", () => {
    const pageSource = readFileSync(
      resolve(process.cwd(), "app/admin/design-partners/page.tsx"),
      "utf8",
    );
    expect(pageSource).toContain("designPartnerPromoteReadiness");
    expect(pageSource).not.toContain("designPartnerApplicationLifecycle");
  });
});

describe("readiness copy", () => {
  it("includes the required non-attestation language", () => {
    expect(PROMOTE_READINESS_ATTESTATION_COPY).toContain("not a completed-readiness attestation");
  });
});
