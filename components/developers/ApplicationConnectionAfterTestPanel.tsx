"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  readHomeBuilderDiscoveryIntent,
  type HomeBuilderDiscoveryIntent,
} from "@/lib/home/homeBuilderDiscovery";
import {
  homeBuilderPlatformLabel,
  mapHomeBuilderPlatformToStarterKit,
} from "@/lib/home/homeBuilderPlatformAdapter";
import type { BuilderHarnessOutcome } from "@/lib/partner/launchpad/formatHarnessResultForBuilder";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import type { BuilderEnforcementSummary } from "@/lib/developers/independentEnforcementSummary";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

function harnessStorageKey(applicationId: string): string {
  return `abx_studio_harness_success_v1_${applicationId}`;
}

export function persistHarnessSuccess(applicationId: string, outcome: BuilderHarnessOutcome): void {
  if (typeof window === "undefined" || outcome.tone !== "success") return;
  window.sessionStorage.setItem(
    harnessStorageKey(applicationId),
    JSON.stringify({ outcome, savedAt: new Date().toISOString() }),
  );
}

export function readPersistedHarnessSuccess(applicationId: string): BuilderHarnessOutcome | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(harnessStorageKey(applicationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { outcome?: BuilderHarnessOutcome };
    return parsed.outcome?.tone === "success" ? parsed.outcome : null;
  } catch {
    return null;
  }
}

export function ApplicationConnectionAfterTestPanel({
  applicationId,
  signedIn,
  packId,
  pathId,
  policyId,
  returnUrl,
  outcome,
}: {
  applicationId: string;
  signedIn: boolean;
  packId: PolicyPackId;
  pathId: IntegrationStudioPathId;
  policyId: string;
  returnUrl: string;
  outcome: BuilderHarnessOutcome;
}) {
  const [intent, setIntent] = useState<HomeBuilderDiscoveryIntent | null>(null);
  const [kitBusy, setKitBusy] = useState(false);
  const [kitError, setKitError] = useState("");
  const [kitFilename, setKitFilename] = useState<string | null>(null);
  const [kitReady, setKitReady] = useState(false);
  const [enforceBusy, setEnforceBusy] = useState(false);
  const [enforceError, setEnforceError] = useState("");
  const [enforceSummary, setEnforceSummary] = useState<BuilderEnforcementSummary | null>(null);

  useEffect(() => {
    setIntent(readHomeBuilderDiscoveryIntent());
    const onIntent = () => setIntent(readHomeBuilderDiscoveryIntent());
    window.addEventListener("abraxas:home-builder-intent", onIntent);
    return () => window.removeEventListener("abraxas:home-builder-intent", onIntent);
  }, []);

  const platform = intent?.platform ?? "application";
  const platformLabel = homeBuilderPlatformLabel(platform);
  const starterPlatform = mapHomeBuilderPlatformToStarterKit(platform);

  const connectApplication = useCallback(async () => {
    if (!signedIn) return;
    setKitBusy(true);
    setKitError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/starter-kit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pack_id: packId,
          path: pathId,
          platform: starterPlatform,
          capabilities: [],
        }),
      });
      const data = await res.json() as {
        ok?: boolean;
        error?: string;
        kit?: { filename?: string; archive_base64?: string };
        filename?: string;
        archive_base64?: string;
      };
      const archive = data.kit?.archive_base64 ?? data.archive_base64;
      const filename = data.kit?.filename ?? data.filename ?? "abraxas-starter-kit.zip";
      if (!res.ok || !data.ok || !archive) {
        setKitError(data.error ?? "Could not generate integration files");
        setKitReady(false);
        return;
      }
      const binary = Uint8Array.from(atob(archive), (c) => c.charCodeAt(0));
      const blob = new Blob([binary], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setKitFilename(filename);
      setKitReady(true);
    } catch {
      setKitError("Could not generate integration files");
    } finally {
      setKitBusy(false);
    }
  }, [applicationId, packId, pathId, signedIn, starterPlatform]);

  async function runIndependentEnforcementCheck() {
    if (!outcome.receiptId) return;
    setEnforceBusy(true);
    setEnforceError("");
    setEnforceSummary(null);
    try {
      const params = new URLSearchParams({
        receipt_id: outcome.receiptId,
        policy_id: policyId,
      });
      const res = await fetch(
        `/api/developers/integration-studio/independent-enforcement?${params.toString()}`,
        { credentials: "include" },
      );
      const data = await res.json() as {
        ok?: boolean;
        enforcement?: BuilderEnforcementSummary;
        status?: string;
      };
      if (!res.ok || !data.ok || !data.enforcement) {
        setEnforceError(data.status ?? "Independent enforcement check unavailable");
        return;
      }
      setEnforceSummary(data.enforcement);
    } catch {
      setEnforceError("Independent enforcement check failed");
    } finally {
      setEnforceBusy(false);
    }
  }

  return (
    <ContentCard title="Connect to my application">
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
        Abraxas verified your sandbox request. Next, wire the same policy into{" "}
        <strong style={{ color: "var(--text-primary)" }}>{platformLabel}</strong> using your existing test app and callback.
      </p>

      <div
        style={{
          fontFamily: FONT,
          fontSize: "0.78rem",
          lineHeight: 1.55,
          margin: "0 0 0.85rem",
          padding: "0.75rem 0.85rem",
          borderRadius: 10,
          border: "1px solid rgba(76,187,146,0.45)",
          background: "var(--surface-inset)",
        }}
      >
        <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>What your application received</p>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          Signed permit outcome ({outcome.observedAccess}). Verify server-side before granting access — never trust the callback URL alone.
        </p>
        {outcome.receiptId ? (
          <p style={{ margin: "0.55rem 0 0", fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)" }}>
            receipt_id: {outcome.receiptId}
          </p>
        ) : null}
        <p style={{ margin: "0.45rem 0 0", fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
          callback: {returnUrl}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <Btn size="sm" disabled={!signedIn || kitBusy} onClick={() => void connectApplication()}>
          {kitBusy ? "Preparing files…" : "Connect to my application"}
        </Btn>
        {outcome.receiptId ? (
          <Btn
            size="sm"
            variant="secondary"
            disabled={enforceBusy || !signedIn}
            onClick={() => void runIndependentEnforcementCheck()}
          >
            {enforceBusy ? "Verifying…" : "Run independent enforcement check"}
          </Btn>
        ) : null}
      </div>

      {kitError ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)" }}>{kitError}</p>
      ) : null}
      {kitReady && kitFilename ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--accent)" }}>
          Downloaded {kitFilename}. Install on your server, set the allowlisted callback to match{" "}
          <code style={{ fontFamily: MONO }}>{returnUrl}</code>, then route live verification through your backend.
        </p>
      ) : null}

      {enforceError ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)" }}>{enforceError}</p>
      ) : null}
      {enforceSummary ? (
        <div
          style={{
            marginTop: "0.65rem",
            padding: "0.65rem 0.75rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface-inset)",
          }}
        >
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, margin: "0 0 0.25rem" }}>
            {enforceSummary.headline}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0 }}>
            {enforceSummary.detail}
          </p>
          <p style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--text-muted)", margin: "0.45rem 0 0" }}>
            reference process only · action={enforceSummary.action}
          </p>
        </div>
      ) : null}

      <details style={{ marginTop: "0.85rem" }}>
        <summary style={{ fontFamily: FONT, fontSize: "0.72rem", cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
          Advanced · receipt inspection & production
        </summary>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.55rem" }}>
          Sandbox success does not approve production or real institutional authority. Use these tools after your application integration works.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.55rem" }}>
          <Btn href="/verify?mode=receipt" variant="secondary" size="sm">
            Receipt inspection
          </Btn>
          <Btn href="/docs/sandbox-conformance" variant="ghost" size="sm">
            Sandbox partner contract
          </Btn>
        </div>
      </details>
    </ContentCard>
  );
}
