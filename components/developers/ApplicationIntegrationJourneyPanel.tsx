"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { homeBuilderPlatformLabel } from "@/lib/home/homeBuilderPlatformAdapter";
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

export function ApplicationIntegrationJourneyPanel({
  applicationId,
  signedIn,
  packId,
  pathId,
  returnUrl,
  outcome,
  testSucceeded = false,
}: {
  applicationId: string;
  signedIn: boolean;
  packId: PolicyPackId;
  pathId: IntegrationStudioPathId;
  policyId: string;
  returnUrl: string;
  outcome: BuilderHarnessOutcome;
  testSucceeded?: boolean;
}) {
  const [intent, setIntent] = useState<HomeBuilderDiscoveryIntent | null>(null);
  const [kitBusy, setKitBusy] = useState(false);
  const [kitError, setKitError] = useState("");
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

  const platform = intent?.platform ?? "website";
  const platformLabel = homeBuilderPlatformLabel(platform);
  const integrationStack = intent?.integrationStack ?? null;
  const starterPlatform = resolveStarterKitPlatform({ platform, integrationStack });
  const needsWebsiteStack = platform === "website" && !integrationStack;

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
    if (!intent) {
      writeHomeBuilderDiscoveryIntent({
        platform: "website",
        policyPackId: packId,
        integrationStack: stack,
      });
    } else {
      writeHomeBuilderDiscoveryIntent({
        platform: intent.platform,
        policyPackId: intent.policyPackId,
        integrationStack: stack,
      });
    }
    setIntent(readHomeBuilderDiscoveryIntent());
  }, [intent, packId]);

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
        setKitError(data.error ?? "Could not prepare files");
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
      writeFlag(kitReadyKey(applicationId));
      setFilesReady(true);
    } catch {
      setKitError("Could not prepare files");
    } finally {
      setKitBusy(false);
    }
  }, [applicationId, packId, pathId, signedIn, starterPlatform]);

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
    || (journey.primaryAction === "get_files" && !starterPlatform);

  const enforcement = acceptance?.external_enforcement;

  return (
    <div
      data-testid="builder-integration-journey"
      style={{ fontFamily: FONT, maxWidth: "32rem" }}
    >
      {testSucceeded && !journey.connectionVerified ? (
        <>
          <AbraxasJourneyEmblemStatus state="verified" detail="Your test worked." />
          <h3
            style={{
              margin: "0.85rem 0 0.35rem",
              fontSize: "1.35rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Now connect your {platform === "website" ? "website" : platformLabel.toLowerCase()}.
          </h3>
        </>
      ) : journey.connectionVerified ? (
        <AbraxasJourneyEmblemStatus state="verified" detail={journey.headline} />
      ) : (
        <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {journey.headline}
        </h3>
      )}

      {!needsWebsiteStack && !journey.connectionVerified ? (
        <p style={{ margin: "0 0 1rem", fontSize: "0.92rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
          {acceptance?.completion_headline ?? journey.support}
        </p>
      ) : null}

      {needsWebsiteStack ? (
        <>
          <p
            style={{
              margin: "0 0 0.65rem",
              fontSize: "0.88rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            Where is your website built?
          </p>
          <div
            data-testid="builder-stack-picker"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "0.45rem",
              marginBottom: "0.85rem",
              maxWidth: "18rem",
            }}
            role="radiogroup"
            aria-label="Website stack"
          >
            {WEBSITE_INTEGRATION_STACKS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={integrationStack === option.id}
                onClick={() => persistStackChoice(option.id)}
                style={{
                  padding: "0.65rem 0.5rem",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowTechnical(true);
              document.getElementById("builder-example-app")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          >
            Try an example
          </Btn>
        </>
      ) : (
        <>
          {integrationStack ? (
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {integrationStackLabel(integrationStack)}
            </p>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            {journey.primaryAction !== "choose_stack" ? (
              <Btn size="sm" disabled={primaryDisabled} onClick={onPrimary}>
                {kitBusy ? "Preparing…" : pollBusy ? "Checking…" : journey.primaryLabel}
              </Btn>
            ) : null}
            {!needsWebsiteStack && journey.showExampleApp && !filesReady ? (
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowTechnical(true);
                  document.getElementById("builder-example-app")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
              >
                Try an example
              </Btn>
            ) : null}
          </div>
        </>
      )}

      {kitError ? (
        <p style={{ fontSize: "0.72rem", color: "var(--danger, #f87171)", marginTop: "0.55rem" }}>{kitError}</p>
      ) : null}
      {pollError ? (
        <p style={{ fontSize: "0.72rem", color: "var(--danger, #f87171)", marginTop: "0.55rem" }}>{pollError}</p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowTechnical((v) => !v)}
        style={{
          marginTop: "1.15rem",
          padding: 0,
          border: "none",
          background: "none",
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          cursor: "pointer",
        }}
      >
        {showTechnical ? "Hide technical details" : "Technical details"}
      </button>

      {showTechnical ? (
        <div
          id="builder-example-app"
          style={{ marginTop: "0.65rem", fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}
        >
          <p style={{ margin: "0 0 0.5rem" }}>{callbackExplanation(returnUrl)}</p>
          <p style={{ margin: "0 0 0.5rem" }}>
            Allowlisted return URL: <code style={{ fontFamily: MONO }}>{returnUrl}</code>
          </p>
          <p style={{ margin: "0 0 0.5rem" }}>
            Example app: <code style={{ fontFamily: MONO }}>{EXTERNAL_NODE_PARTNER_REFERENCE.repoPath}</code>
          </p>
          {outcome.receiptId ? (
            <p style={{ margin: "0 0 0.5rem" }}>
              Sandbox receipt: <code style={{ fontFamily: MONO }}>{outcome.receiptId}</code>
            </p>
          ) : null}
          {enforcement ? (
            <p style={{ margin: "0 0 0.5rem" }}>
              Permit verified: {enforcement.verified_permit ? "yes" : "no"} · Deny verified:{" "}
              {enforcement.verified_deny ? "yes" : "no"}
            </p>
          ) : null}
          <Link href="/developers/integration-studio?advanced=1#request" style={{ color: "var(--accent)", fontWeight: 700 }}>
            Open integration inspector
          </Link>
        </div>
      ) : null}
    </div>
  );
}
