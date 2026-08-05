// FILE: lib/integration/compatibilityManifestPreflight.ts
// Read-only validation of deployed GET /api/protocol/compatibility against local manifest.

import type { PreflightCheck, PreflightStatus } from "@/lib/integration/preflightTypes";
import {
  PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH,
  PARTNER_FLOW_COMPATIBILITY_VERSION,
  buildPartnerFlowCompatibilityManifest,
  type PartnerFlowCompatibilityManifest,
} from "@/lib/protocol/partnerFlowCompatibilityManifest";
import { SITE_URL } from "@/lib/siteUrl";

const STALE_HOST = "abraxas-app.vercel.app";

export const COMPATIBILITY_MANIFEST_CHECK_IDS = {
  endpoint: "http-compatibility-manifest-endpoint",
  contract: "http-compatibility-manifest-contract",
  noStaleHost: "http-compatibility-manifest-no-stale-host",
} as const;

function preflightCheck(
  id: string,
  label: string,
  status: PreflightStatus,
  evidence: string,
): PreflightCheck {
  return { id, label, status, evidence };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every(item => typeof item === "string")) {
    return null;
  }
  return value as string[];
}

function readBrowserPaths(value: unknown): PartnerFlowCompatibilityManifest["browser_paths"] | null {
  if (!isRecord(value)) return null;
  const keys = ["entry", "passport_handoff", "evaluate", "complete", "refresh", "public_receipt"] as const;
  const paths = {} as PartnerFlowCompatibilityManifest["browser_paths"];
  for (const key of keys) {
    if (typeof value[key] !== "string") return null;
    paths[key] = value[key];
  }
  return paths;
}

export interface ValidateDeployedCompatibilityManifestInput {
  productionMode: boolean;
  baseUrl: string;
  httpOk: boolean;
  rawText: string;
  liveJson: unknown;
  expectedManifest?: PartnerFlowCompatibilityManifest;
}

export interface ValidateDeployedCompatibilityManifestResult {
  checks: PreflightCheck[];
}

/** Compare deployed manifest JSON against the local source of truth. */
export function validateDeployedCompatibilityManifest(
  input: ValidateDeployedCompatibilityManifestInput,
): ValidateDeployedCompatibilityManifestResult {
  const checks: PreflightCheck[] = [];
  const expected = input.expectedManifest
    ?? buildPartnerFlowCompatibilityManifest(input.baseUrl.replace(/\/$/, "") || SITE_URL);

  if (!input.baseUrl) {
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.endpoint,
        "Deployed compatibility manifest reachable",
        "pending",
        `Set INTEGRATION_PREFLIGHT_BASE_URL to probe ${PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH}`,
      ),
    );
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.contract,
        "Deployed compatibility manifest matches frozen Partner Flow contract",
        "pending",
        "No base URL — skipping live manifest comparison",
      ),
    );
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.noStaleHost,
        "Deployed compatibility manifest has no stale Vercel host",
        "pending",
        "No base URL — skipping live manifest fetch",
      ),
    );
    return { checks };
  }

  if (!input.httpOk) {
    const status: PreflightStatus = input.productionMode ? "fail" : "pending";
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.endpoint,
        "Deployed compatibility manifest reachable",
        status,
        `GET ${PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH} failed`,
      ),
    );
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.contract,
        "Deployed compatibility manifest matches frozen Partner Flow contract",
        status,
        "Manifest endpoint unavailable",
      ),
    );
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.noStaleHost,
        "Deployed compatibility manifest has no stale Vercel host",
        status,
        "Manifest endpoint unavailable",
      ),
    );
    return { checks };
  }

  checks.push(
    preflightCheck(
      COMPATIBILITY_MANIFEST_CHECK_IDS.endpoint,
      "Deployed compatibility manifest reachable",
      "pass",
      `GET ${PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH} OK`,
    ),
  );

  if (input.rawText.includes(STALE_HOST)) {
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.noStaleHost,
        "Deployed compatibility manifest has no stale Vercel host",
        "fail",
        `Response body contains ${STALE_HOST}`,
      ),
    );
  } else {
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.noStaleHost,
        "Deployed compatibility manifest has no stale Vercel host",
        "pass",
        `No ${STALE_HOST} in manifest response`,
      ),
    );
  }

  const drift: string[] = [];
  const live = input.liveJson;

  if (!isRecord(live)) {
    drift.push("response is not a JSON object");
  } else {
    const version = live.compatibility_version;
    if (version !== PARTNER_FLOW_COMPATIBILITY_VERSION) {
      drift.push(`compatibility_version=${String(version)} expected ${PARTNER_FLOW_COMPATIBILITY_VERSION}`);
    }

    const canonicalOrigin = live.canonical_origin;
    if (input.productionMode && canonicalOrigin !== SITE_URL) {
      drift.push(`canonical_origin=${String(canonicalOrigin)} expected ${SITE_URL}`);
    } else if (canonicalOrigin !== expected.canonical_origin) {
      drift.push(`canonical_origin=${String(canonicalOrigin)} expected ${expected.canonical_origin}`);
    }

    const browserPaths = readBrowserPaths(live.browser_paths);
    if (!browserPaths) {
      drift.push("browser_paths missing or malformed");
    } else {
      for (const [key, path] of Object.entries(expected.browser_paths)) {
        if (browserPaths[key as keyof typeof browserPaths] !== path) {
          drift.push(`browser_paths.${key}=${browserPaths[key as keyof typeof browserPaths]} expected ${path}`);
        }
      }
    }

    const callback = isRecord(live.callback) ? live.callback : null;
    const liveCallbackParams = callback ? readStringArray(callback.query_parameters) : null;
    if (!liveCallbackParams) {
      drift.push("callback.query_parameters missing or malformed");
    } else if (liveCallbackParams.slice().sort().join() !== expected.callback.query_parameters.slice().sort().join()) {
      drift.push(
        `callback.query_parameters mismatch (live=${liveCallbackParams.join(",")})`,
      );
    }

    const publicReceipt = isRecord(live.public_receipt) ? live.public_receipt : null;
    const liveRequired = publicReceipt ? readStringArray(publicReceipt.required_view_fields) : null;
    const liveFrozen = publicReceipt ? readStringArray(publicReceipt.frozen_view_fields) : null;

    if (!liveRequired) {
      drift.push("public_receipt.required_view_fields missing or malformed");
    } else {
      const missingRequired = expected.public_receipt.required_view_fields.filter(
        field => !liveRequired.includes(field),
      );
      if (missingRequired.length > 0) {
        drift.push(`missing public_receipt.required_view_fields: ${missingRequired.join(", ")}`);
      }
    }

    if (!liveFrozen) {
      drift.push("public_receipt.frozen_view_fields missing or malformed");
    } else {
      const missingFrozen = expected.public_receipt.frozen_view_fields.filter(
        field => !liveFrozen.includes(field),
      );
      if (missingFrozen.length > 0) {
        drift.push(`missing public_receipt.frozen_view_fields: ${missingFrozen.join(", ")}`);
      }
    }

  }

  if (drift.length > 0) {
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.contract,
        "Deployed compatibility manifest matches frozen Partner Flow contract",
        "fail",
        drift.join("; "),
      ),
    );
  } else {
    checks.push(
      preflightCheck(
        COMPATIBILITY_MANIFEST_CHECK_IDS.contract,
        "Deployed compatibility manifest matches frozen Partner Flow contract",
        "pass",
        `compatibility_version=${PARTNER_FLOW_COMPATIBILITY_VERSION}; canonical_origin=${SITE_URL}; frozen paths/callback/receipt fields aligned with local manifest`,
      ),
    );
  }

  return { checks };
}
