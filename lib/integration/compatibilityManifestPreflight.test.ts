import { describe, expect, it } from "vitest";
import {
  COMPATIBILITY_MANIFEST_CHECK_IDS,
  validateDeployedCompatibilityManifest,
} from "@/lib/integration/compatibilityManifestPreflight";
import {
  PARTNER_FLOW_COMPATIBILITY_VERSION,
  buildPartnerFlowCompatibilityManifest,
} from "@/lib/protocol/partnerFlowCompatibilityManifest";
import { SITE_URL } from "@/lib/siteUrl";

const STALE = "abraxas-app.vercel.app";
const expected = buildPartnerFlowCompatibilityManifest(SITE_URL);

function liveManifest(overrides: Record<string, unknown> = {}) {
  return { ...buildPartnerFlowCompatibilityManifest(SITE_URL), ...overrides };
}

describe("validateDeployedCompatibilityManifest", () => {
  it("passes when live manifest matches local source of truth", () => {
    const manifest = liveManifest();
    const { checks } = validateDeployedCompatibilityManifest({
      productionMode: true,
      baseUrl: SITE_URL,
      httpOk: true,
      rawText: JSON.stringify(manifest),
      liveJson: manifest,
      expectedManifest: expected,
    });

    expect(checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.endpoint)?.status).toBe("pass");
    expect(checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.contract)?.status).toBe("pass");
    expect(checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.noStaleHost)?.status).toBe("pass");
  });

  it("fails on compatibility version mismatch", () => {
    const manifest = liveManifest({ compatibility_version: "2.0.0" });
    const { checks } = validateDeployedCompatibilityManifest({
      productionMode: true,
      baseUrl: SITE_URL,
      httpOk: true,
      rawText: JSON.stringify(manifest),
      liveJson: manifest,
      expectedManifest: expected,
    });

    const contract = checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.contract);
    expect(contract?.status).toBe("fail");
    expect(contract?.evidence).toContain("compatibility_version=2.0.0");
    expect(contract?.evidence).toContain(PARTNER_FLOW_COMPATIBILITY_VERSION);
  });

  it("fails when a frozen public receipt field is missing", () => {
    const manifest = liveManifest({
      public_receipt: {
        ...expected.public_receipt,
        frozen_view_fields: expected.public_receipt.frozen_view_fields.filter(
          f => f !== "signature_valid",
        ),
      },
    });
    const { checks } = validateDeployedCompatibilityManifest({
      productionMode: true,
      baseUrl: SITE_URL,
      httpOk: true,
      rawText: JSON.stringify(manifest),
      liveJson: manifest,
      expectedManifest: expected,
    });

    const contract = checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.contract);
    expect(contract?.status).toBe("fail");
    expect(contract?.evidence).toContain("signature_valid");
  });

  it("fails when response contains stale Vercel host", () => {
    const manifest = liveManifest();
    const raw = JSON.stringify(manifest).replace(SITE_URL, `https://${STALE}`);
    const { checks } = validateDeployedCompatibilityManifest({
      productionMode: true,
      baseUrl: SITE_URL,
      httpOk: true,
      rawText: raw,
      liveJson: JSON.parse(raw),
      expectedManifest: expected,
    });

    expect(checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.noStaleHost)?.status).toBe("fail");
  });

  it("marks endpoint failure as pending outside production mode", () => {
    const { checks } = validateDeployedCompatibilityManifest({
      productionMode: false,
      baseUrl: SITE_URL,
      httpOk: false,
      rawText: "",
      liveJson: null,
      expectedManifest: expected,
    });

    expect(checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.endpoint)?.status).toBe("pending");
    expect(checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.contract)?.status).toBe("pending");
  });

  it("marks endpoint failure as fail in production mode", () => {
    const { checks } = validateDeployedCompatibilityManifest({
      productionMode: true,
      baseUrl: SITE_URL,
      httpOk: false,
      rawText: "",
      liveJson: null,
      expectedManifest: expected,
    });

    expect(checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.endpoint)?.status).toBe("fail");
    expect(checks.find(c => c.id === COMPATIBILITY_MANIFEST_CHECK_IDS.contract)?.status).toBe("fail");
  });

  it("returns pending when base URL is unset", () => {
    const { checks } = validateDeployedCompatibilityManifest({
      productionMode: true,
      baseUrl: "",
      httpOk: false,
      rawText: "",
      liveJson: null,
    });

    expect(checks.every(c => c.status === "pending")).toBe(true);
  });
});
