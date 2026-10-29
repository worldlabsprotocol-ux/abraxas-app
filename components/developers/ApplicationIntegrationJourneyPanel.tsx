"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  builderIntegrationPhaseDetail,
  type BuilderIntegrationAcceptanceView,
} from "@/lib/developers/builderExternalIntegrationAcceptance";
import {
  readHomeBuilderDiscoveryIntent,
  type HomeBuilderDiscoveryIntent,
} from "@/lib/home/homeBuilderDiscovery";
import {
  homeBuilderPlatformLabel,
  mapHomeBuilderPlatformToStarterKit,
} from "@/lib/home/homeBuilderPlatformAdapter";
import { EXTERNAL_NODE_PARTNER_REFERENCE } from "@/lib/developers/integrationAdoptionPath";
import type { BuilderHarnessOutcome } from "@/lib/partner/launchpad/formatHarnessResultForBuilder";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

function kitReadyKey(applicationId: string): string {
  return `abx_builder_kit_ready_v1_${applicationId}`;
}

function serverAckKey(applicationId: string): string {
  return `abx_builder_server_ack_v1_${applicationId}`;
}

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(key) === "1";
}

function writeFlag(key: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, "1");
}

const kicker: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.62rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  margin: "0 0 0.35rem",
};

const stepTitle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "var(--text-primary)",
  margin: 0,
};

function OutcomeChip({ label, active, tone }: { label: string; active: boolean; tone: "permit" | "deny" | "indeterminate" }) {
  const color =
    tone === "permit" ? "rgba(76,187,146,0.9)"
    : tone === "deny" ? "rgba(248,113,113,0.9)"
    : "rgba(245,158,11,0.9)";
  return (
    <span
      style={{
        fontFamily: FONT,
        fontSize: "0.72rem",
        fontWeight: 700,
        padding: "0.35rem 0.65rem",
        borderRadius: 999,
        border: `1px solid ${active ? color : "var(--border)"}`,
        color: active ? color : "var(--text-muted)",
        opacity: active ? 1 : 0.55,
      }}
    >
      {label}
    </span>
  );
}

export function ApplicationIntegrationJourneyPanel({
  applicationId,
  signedIn,
  packId,
  pathId,
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
  const [filesReady, setFilesReady] = useState(false);
  const [serverAck, setServerAck] = useState(false);
  const [pollBusy, setPollBusy] = useState(false);
  const [pollError, setPollError] = useState("");
  const [acceptance, setAcceptance] = useState<BuilderIntegrationAcceptanceView | null>(null);

  useEffect(() => {
    setIntent(readHomeBuilderDiscoveryIntent());
    setFilesReady(readFlag(kitReadyKey(applicationId)));
    setServerAck(readFlag(serverAckKey(applicationId)));
    const onIntent = () => setIntent(readHomeBuilderDiscoveryIntent());
    window.addEventListener("abraxas:home-builder-intent", onIntent);
    return () => window.removeEventListener("abraxas:home-builder-intent", onIntent);
  }, [applicationId]);

  const platform = intent?.platform ?? "application";
  const platformLabel = homeBuilderPlatformLabel(platform);
  const starterPlatform = mapHomeBuilderPlatformToStarterKit(platform);

  const pollExternalState = useCallback(async () => {
    if (!signedIn) return;
    setPollBusy(true);
    setPollError("");
    try {
      const params = new URLSearchParams({
        application_id: applicationId,
        harness_ok: "1",
        files_ready: filesReady ? "1" : "0",
        server_ack: serverAck ? "1" : "0",
      });
      const res = await fetch(
        `/api/developers/integration-studio/external-integration-state?${params.toString()}`,
        { credentials: "include" },
      );
      const data = await res.json() as {
        ok?: boolean;
        acceptance?: BuilderIntegrationAcceptanceView;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.acceptance) {
        setPollError(data.error ?? "Could not read application integration state");
        return;
      }
      setAcceptance(data.acceptance);
    } catch {
      setPollError("Could not read application integration state");
    } finally {
      setPollBusy(false);
    }
  }, [applicationId, filesReady, serverAck, signedIn]);

  useEffect(() => {
    if (filesReady && serverAck && signedIn) {
      void pollExternalState();
    }
  }, [filesReady, serverAck, signedIn, pollExternalState]);

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
        setKitError(data.error ?? "Could not prepare integration files");
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
      writeFlag(kitReadyKey(applicationId));
      setFilesReady(true);
    } catch {
      setKitError("Could not prepare integration files");
    } finally {
      setKitBusy(false);
    }
  }, [applicationId, packId, pathId, signedIn, starterPlatform]);

  const phase = acceptance?.phase ?? (filesReady ? (serverAck ? "awaiting_application_setup" : "integration_files_ready") : "sandbox_demonstrated");
  const enforcement = acceptance?.external_enforcement ?? { permit: false, deny: false, indeterminate: false };
  const complete = acceptance?.completion_headline != null;

  return (
    <ContentCard title="Make it work in your application">
      <div style={{ display: "grid", gap: "0.85rem" }}>
        <section>
          <p style={kicker}>Already demonstrated</p>
          <AbraxasJourneyEmblemStatus state="verified" detail="Your Abraxas test worked" />
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.45rem 0 0" }}>
            {builderIntegrationPhaseDetail("sandbox_demonstrated")}
          </p>
        </section>

        <section
          style={{
            padding: "0.85rem 0.95rem",
            borderRadius: 12,
            border: "1px solid rgba(76,187,146,0.45)",
            background: "var(--surface-inset)",
          }}
        >
          <p style={kicker}>Next milestone</p>
          <p style={stepTitle}>Connect your {platformLabel} backend</p>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.45rem 0 0.75rem", lineHeight: 1.55 }}>
            Use the same policy and test app. Run verification from your server, not from this page alone.
          </p>

          {!filesReady ? (
            <Btn size="sm" disabled={!signedIn || kitBusy} onClick={() => void connectApplication()}>
              {kitBusy ? "Preparing…" : "Connect my application"}
            </Btn>
          ) : (
            <>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--accent)", margin: "0 0 0.65rem" }}>
                {kitFilename ? `Files ready (${kitFilename}).` : "Integration files ready."} Install on your server with the sandbox API key.
              </p>
              <ol style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0 0 0.75rem", paddingLeft: "1.1rem", lineHeight: 1.55 }}>
                <li>Set callback to <code style={{ fontFamily: MONO }}>{returnUrl}</code></li>
                <li>Store the API key in server environment only</li>
                <li>POST partner-handoff from your backend, then complete holder flow if required</li>
              </ol>
              {!serverAck ? (
                <Btn size="sm" variant="secondary" onClick={() => {
                  writeFlag(serverAckKey(applicationId));
                  setServerAck(true);
                }}>
                  My server is running
                </Btn>
              ) : (
                <Btn size="sm" disabled={pollBusy} onClick={() => void pollExternalState()}>
                  {pollBusy ? "Checking…" : "Check my application"}
                </Btn>
              )}
            </>
          )}

          {kitError ? (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)", marginTop: "0.55rem" }}>{kitError}</p>
          ) : null}
          {pollError ? (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)", marginTop: "0.55rem" }}>{pollError}</p>
          ) : null}
          {acceptance && !complete ? (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.65rem" }}>
              Current state: <strong style={{ color: "var(--text-primary)" }}>{acceptance.phase_label}</strong>
              {" · "}
              {builderIntegrationPhaseDetail(acceptance.phase)}
            </p>
          ) : null}
        </section>

        <section>
          <p style={kicker}>Final proof</p>
          {complete && acceptance?.completion_headline ? (
            <>
              <p style={{ ...stepTitle, color: "rgba(76,187,146,0.95)" }}>{acceptance.completion_headline}</p>
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.45rem 0 0.65rem" }}>
                Your application verified and enforced the decision.
              </p>
            </>
          ) : (
            <p style={stepTitle}>Your application verified and enforced the decision</p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.55rem" }}>
            <OutcomeChip label="Permit" active={enforcement.permit} tone="permit" />
            <OutcomeChip label="Deny" active={enforcement.deny} tone="deny" />
            <OutcomeChip label="Indeterminate" active={enforcement.indeterminate} tone="indeterminate" />
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.55rem 0 0", lineHeight: 1.5 }}>
            The external application should permit only independently verified, currently acceptable authorization.
            Run a deny scenario from your server to see the blocked path.
          </p>
        </section>
      </div>

      <details style={{ marginTop: "0.95rem" }}>
        <summary style={{ fontFamily: FONT, fontSize: "0.72rem", cursor: "pointer", fontWeight: 800, color: "var(--accent)" }}>
          Advanced · local reference server and receipt tools
        </summary>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "0.55rem", lineHeight: 1.55 }}>
          The copy-ready Node example at{" "}
          <code style={{ fontFamily: MONO }}>{EXTERNAL_NODE_PARTNER_REFERENCE.repoPath}</code> runs on{" "}
          {EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackBase} as a separate process. It is not your deployed site.
          Sandbox receipt from this page:{" "}
          {outcome.receiptId ? (
            <code style={{ fontFamily: MONO }}>{outcome.receiptId}</code>
          ) : (
            "none yet"
          )}
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
