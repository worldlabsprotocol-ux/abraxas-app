"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { BuilderIntegrationAcceptanceView } from "@/lib/developers/builderExternalIntegrationAcceptance";
import {
  callbackExplanation,
  resolveBuilderJourneyView,
} from "@/lib/developers/builderIntegrationJourneyUi";
import { EXTERNAL_NODE_PARTNER_REFERENCE } from "@/lib/developers/integrationAdoptionPath";
import {
  readHomeBuilderDiscoveryIntent,
  writeHomeBuilderDiscoveryIntent,
  type HomeBuilderDiscoveryIntent,
} from "@/lib/home/homeBuilderDiscovery";
import {
  homeBuilderPlatformLabel,
} from "@/lib/home/homeBuilderPlatformAdapter";
import {
  integrationStackLabel,
  resolveStarterKitPlatform,
  WEBSITE_INTEGRATION_STACKS,
  type HomeBuilderIntegrationStackId,
} from "@/lib/home/homeBuilderIntegrationStack";
import type { BuilderHarnessOutcome } from "@/lib/partner/launchpad/formatHarnessResultForBuilder";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

function kitReadyKey(applicationId: string): string {
  return `abx_builder_kit_ready_v1_${applicationId}`;
}

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(key) === "1";
}

function writeFlag(key: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, "1");
}

function OutcomeChip({ label, active, tone }: { label: string; active: boolean; tone: "permit" | "deny" | "indeterminate" }) {
  const color =
    tone === "permit" ? "rgba(76,187,146,0.9)"
    : tone === "deny" ? "rgba(248,113,113,0.9)"
    : "rgba(245,158,11,0.9)";
  return (
    <span
      style={{
        fontFamily: FONT,
        fontSize: "0.75rem",
        fontWeight: 700,
        padding: "0.35rem 0.7rem",
        borderRadius: 999,
        border: `1px solid ${active ? color : "rgba(255,255,255,0.12)"}`,
        color: active ? color : "var(--text-muted)",
        opacity: active ? 1 : 0.5,
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
  const [pendingStack, setPendingStack] = useState<HomeBuilderIntegrationStackId | null>(null);
  const [kitBusy, setKitBusy] = useState(false);
  const [kitError, setKitError] = useState("");
  const [kitFilename, setKitFilename] = useState<string | null>(null);
  const [filesReady, setFilesReady] = useState(false);
  const [pollBusy, setPollBusy] = useState(false);
  const [pollError, setPollError] = useState("");
  const [acceptance, setAcceptance] = useState<BuilderIntegrationAcceptanceView | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  useEffect(() => {
    setIntent(readHomeBuilderDiscoveryIntent());
    setFilesReady(readFlag(kitReadyKey(applicationId)));
    const onIntent = () => setIntent(readHomeBuilderDiscoveryIntent());
    window.addEventListener("abraxas:home-builder-intent", onIntent);
    return () => window.removeEventListener("abraxas:home-builder-intent", onIntent);
  }, [applicationId]);

  const platform = intent?.platform ?? "application";
  const platformLabel = homeBuilderPlatformLabel(platform);
  const integrationStack = intent?.integrationStack ?? null;
  const starterPlatform = resolveStarterKitPlatform({ platform, integrationStack });

  const pollExternalState = useCallback(async () => {
    if (!signedIn) return;
    setPollBusy(true);
    setPollError("");
    try {
      const params = new URLSearchParams({
        application_id: applicationId,
        harness_ok: "1",
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
        setPollError(data.error ?? "Could not read connection state");
        return;
      }
      setAcceptance(data.acceptance);
    } catch {
      setPollError("Could not read connection state");
    } finally {
      setPollBusy(false);
    }
  }, [applicationId, signedIn]);

  useEffect(() => {
    if (filesReady && signedIn) {
      void pollExternalState();
    }
  }, [filesReady, signedIn, pollExternalState]);

  const persistStackChoice = useCallback((stack: HomeBuilderIntegrationStackId) => {
    if (!intent) return;
    writeHomeBuilderDiscoveryIntent({
      platform: intent.platform,
      policyPackId: intent.policyPackId,
      integrationStack: stack,
    });
    setIntent(readHomeBuilderDiscoveryIntent());
    setPendingStack(stack);
  }, [intent]);

  const downloadIntegrationFiles = useCallback(async () => {
    if (!signedIn || !starterPlatform) return;
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

  const enforcement = acceptance?.external_enforcement ?? {
    permit: false,
    deny: false,
    indeterminate: false,
    verified_permit: false,
    verified_deny: false,
  };

  const journey = useMemo(
    () =>
      resolveBuilderJourneyView({
        platform,
        platformLabel,
        integrationStack,
        filesReady,
        acceptancePhase: acceptance?.phase ?? null,
        setupComplete: acceptance?.setup_complete === true,
      }),
    [acceptance?.phase, acceptance?.setup_complete, filesReady, integrationStack, platform, platformLabel],
  );

  const onPrimary = () => {
    if (journey.primaryAction === "get_files") {
      void downloadIntegrationFiles();
      return;
    }
    if (journey.primaryAction === "check_connection") {
      void pollExternalState();
    }
  };

  const primaryDisabled =
    !signedIn
    || kitBusy
    || pollBusy
    || (journey.primaryAction === "get_files" && !starterPlatform)
    || (journey.primaryAction === "choose_stack" && !pendingStack);

  return (
    <div
      data-testid="builder-integration-journey"
      style={{
        marginTop: "1.25rem",
        padding: "1.1rem 0 0",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        fontFamily: FONT,
      }}
    >
      <p
        style={{
          margin: "0 0 0.35rem",
          fontSize: "0.62rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {journey.stageKicker}
      </p>

      {journey.connectionVerified ? (
        <AbraxasJourneyEmblemStatus state="verified" detail={journey.headline} />
      ) : (
        <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {journey.headline}
        </h3>
      )}

      <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", color: "var(--text-secondary)", maxWidth: "36rem" }}>
        {acceptance?.completion_headline ?? journey.support}
      </p>

      {platform === "website" && !integrationStack ? (
        <div
          data-testid="builder-stack-picker"
          style={{ display: "grid", gap: "0.45rem", marginBottom: "1rem", maxWidth: "28rem" }}
          role="radiogroup"
          aria-label="Website stack"
        >
          {WEBSITE_INTEGRATION_STACKS.map((option) => {
            const selected = pendingStack === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => persistStackChoice(option.id)}
                style={{
                  textAlign: "left",
                  padding: "0.65rem 0.75rem",
                  borderRadius: 10,
                  border: selected ? "1px solid rgba(76,187,146,0.55)" : "1px solid rgba(255,255,255,0.1)",
                  background: selected ? "rgba(76,187,146,0.08)" : "transparent",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "block", fontWeight: 700, fontSize: "0.88rem" }}>{option.label}</span>
                <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  {option.detail}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {integrationStack ? (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Stack: {integrationStackLabel(integrationStack)}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", alignItems: "center" }}>
        {journey.primaryAction !== "choose_stack" ? (
          <Btn size="sm" disabled={primaryDisabled} onClick={onPrimary}>
            {kitBusy ? "Preparing…" : pollBusy ? "Checking…" : journey.primaryLabel}
          </Btn>
        ) : null}
        {journey.showExampleApp ? (
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowTechnical(true);
              document.getElementById("builder-example-app")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          >
            Try example application
          </Btn>
        ) : null}
      </div>

      {filesReady && kitFilename ? (
        <p data-testid="builder-files-ready" style={{ margin: "0.75rem 0 0", fontSize: "0.72rem", color: "var(--accent)" }}>
          Files saved: {kitFilename}
        </p>
      ) : null}

      {kitError ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)", marginTop: "0.55rem" }}>{kitError}</p>
      ) : null}
      {pollError ? (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)", marginTop: "0.55rem" }}>{pollError}</p>
      ) : null}

      {acceptance && !journey.connectionVerified ? (
        <p style={{ margin: "0.65rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Status: {acceptance.phase_label}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "1rem" }}>
        <OutcomeChip label="Permit" active={enforcement.verified_permit} tone="permit" />
        <OutcomeChip label="Deny" active={enforcement.verified_deny} tone="deny" />
        <OutcomeChip
          label="Blocked"
          active={enforcement.indeterminate && !enforcement.verified_permit}
          tone="indeterminate"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowTechnical((v) => !v)}
        style={{
          marginTop: "1rem",
          padding: 0,
          border: "none",
          background: "none",
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--accent)",
          cursor: "pointer",
        }}
      >
        {showTechnical ? "Hide technical details" : "Technical details"}
      </button>

      {showTechnical ? (
        <div id="builder-example-app" style={{ marginTop: "0.65rem", fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
          <p style={{ margin: "0 0 0.5rem" }}>{callbackExplanation(returnUrl)}</p>
          <p style={{ margin: "0 0 0.5rem" }}>
            Allowlisted return URL: <code style={{ fontFamily: MONO }}>{returnUrl}</code>
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            Example server path: <code style={{ fontFamily: MONO }}>{EXTERNAL_NODE_PARTNER_REFERENCE.repoPath}</code>
            {" "}
            on
            {" "}
            <code style={{ fontFamily: MONO }}>{EXTERNAL_NODE_PARTNER_REFERENCE.defaultCallbackBase}</code>
            . You start it locally when ready. Abraxas does not deploy your site.
          </p>
          <p style={{ margin: 0 }}>
            Sandbox receipt from this test:
            {" "}
            {outcome.receiptId ? (
              <code style={{ fontFamily: MONO }}>{outcome.receiptId}</code>
            ) : (
              "none yet"
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
