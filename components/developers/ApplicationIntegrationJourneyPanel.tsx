"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { BuilderReferenceExampleExperience } from "@/components/developers/BuilderReferenceExampleExperience";
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
  const [surface, setSurface] = useState<"connect" | "example">("connect");

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

  if (surface === "example") {
    return (
      <div className="abx-builder-journey-shell">
        <div className="abx-builder-journey-shell__inner">
          <BuilderReferenceExampleExperience
            applicationId={applicationId}
            signedIn={signedIn}
            returnUrl={returnUrl}
            onBack={() => setSurface("connect")}
          />
        </div>
      </div>
    );
  }

  return (
    <BuilderActiveTask
      taskKey={journey.connectionVerified ? "connection-verified" : needsWebsiteStack ? "choose-stack" : journey.primaryAction}
      testId="builder-integration-journey"
      title={testSucceeded && !journey.connectionVerified
        ? `Now connect your ${platform === "website" ? "website" : platformLabel.toLowerCase()}.`
        : journey.headline}
      description={journey.connectionVerified ? journey.support : acceptance?.completion_headline ?? journey.support}
      state={kitBusy || pollBusy ? "pending" : kitError || pollError ? "failure" : journey.connectionVerified ? "success" : "ready"}
      status={kitBusy ? "Preparing integration files" : pollBusy ? "Checking connection" : journey.connectionVerified ? "Connection verified" : undefined}
      error={kitError || pollError}
      action={!needsWebsiteStack && journey.primaryAction !== "choose_stack" ? (
        <Btn size="sm" disabled={primaryDisabled} loading={kitBusy || pollBusy} onClick={onPrimary}>
          {journey.primaryLabel}
        </Btn>
      ) : null}
      advanced={
        <details className="abx-builder-technical-panel">
          <summary className="abx-builder-technical-toggle">Technical details</summary>
          <p>{callbackExplanation(returnUrl)}</p>
          <p>Allowlisted return URL: <code>{returnUrl}</code></p>
          <p>Example app: <code>{EXTERNAL_NODE_PARTNER_REFERENCE.repoPath}</code></p>
          {outcome.receiptId ? <p>Sandbox receipt: <code>{outcome.receiptId}</code></p> : null}
          {enforcement ? (
            <p>Permit verified: {enforcement.verified_permit ? "yes" : "no"} · Deny verified: {enforcement.verified_deny ? "yes" : "no"}</p>
          ) : null}
          <Link href="/developers/integration-studio?advanced=1#request">Open integration inspector</Link>
        </details>
      }
    >
      {needsWebsiteStack ? (
        <>
          <div data-testid="builder-stack-picker" className="abx-builder-stack-grid" role="radiogroup" aria-label="Website stack">
            {WEBSITE_INTEGRATION_STACKS.map((option) => (
              <button key={option.id} type="button" role="radio" aria-checked={integrationStack === option.id}
                className="abx-builder-stack-chip" onClick={() => persistStackChoice(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
          <p className="abx-builder-journey-footnote">
            Don&apos;t have a website?{" "}
            <button type="button" className="abx-builder-inline-link" onClick={() => setSurface("example")}>Try an example</button>
          </p>
        </>
      ) : (
        <>
          {integrationStack ? <p className="abx-builder-journey-meta">{integrationStackLabel(integrationStack)}</p> : null}
          {journey.showExampleApp && !filesReady ? (
            <button type="button" className="abx-builder-inline-link" onClick={() => setSurface("example")}>Try an example</button>
          ) : null}
        </>
      )}
    </BuilderActiveTask>
  );
}
