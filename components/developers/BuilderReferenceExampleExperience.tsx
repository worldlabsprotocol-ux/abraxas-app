"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { BuilderIntegrationAcceptanceView } from "@/lib/developers/builderExternalIntegrationAcceptance";
import { isLocalReferenceCallbackUrl } from "@/lib/developers/integrationAdoptionPath";
import {
  probeReferenceExampleServer,
  REFERENCE_EXAMPLE_APP_URL,
  REFERENCE_EXAMPLE_START_COMMAND,
  type ReferenceExampleReachability,
} from "@/lib/developers/referenceExampleServer";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

function protectedAccessLabel(acceptance: BuilderIntegrationAcceptanceView | null): {
  title: string;
  detail: string;
  tone: "waiting" | "permit" | "deny" | "indeterminate";
} {
  const enforcement = acceptance?.external_enforcement;
  if (enforcement?.verified_permit) {
    return { title: "Protected access", detail: "Access permitted", tone: "permit" };
  }
  if (enforcement?.verified_deny) {
    return { title: "Protected access", detail: "Access blocked", tone: "deny" };
  }
  if (enforcement?.indeterminate) {
    return { title: "Protected access", detail: "Outcome indeterminate", tone: "indeterminate" };
  }
  return { title: "Protected access", detail: "Waiting for verification", tone: "waiting" };
}

export function BuilderReferenceExampleExperience({
  applicationId,
  signedIn,
  returnUrl,
  onBack,
}: {
  applicationId: string;
  signedIn: boolean;
  returnUrl: string;
  onBack: () => void;
}) {
  const [reachability, setReachability] = useState<ReferenceExampleReachability>("checking");
  const [acceptance, setAcceptance] = useState<BuilderIntegrationAcceptanceView | null>(null);
  const [pollBusy, setPollBusy] = useState(false);
  const [pollError, setPollError] = useState("");

  const runProbe = useCallback(async () => {
    setReachability("checking");
    const result = await probeReferenceExampleServer();
    setReachability(result);
    return result;
  }, []);

  const pollEnforcement = useCallback(async () => {
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
      const data = (await res.json()) as {
        ok?: boolean;
        acceptance?: BuilderIntegrationAcceptanceView;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.acceptance) {
        setPollError(data.error ?? "Could not read enforcement evidence");
        return;
      }
      setAcceptance(data.acceptance);
    } catch {
      setPollError("Could not read enforcement evidence");
    } finally {
      setPollBusy(false);
    }
  }, [applicationId, signedIn]);

  useEffect(() => {
    void runProbe();
  }, [runProbe]);

  useEffect(() => {
    if (reachability !== "reachable" || !signedIn) return;
    void pollEnforcement();
    const id = window.setInterval(() => void pollEnforcement(), 12_000);
    return () => window.clearInterval(id);
  }, [reachability, signedIn, pollEnforcement]);

  const access = protectedAccessLabel(acceptance);
  const callbackReady = isLocalReferenceCallbackUrl(returnUrl);

  return (
    <div data-testid="builder-reference-example" style={{ fontFamily: FONT }}>
      <AbraxasJourneyEmblemStatus state="verified" detail="Your test worked." />
      <h3
        style={{
          margin: "0.85rem 0 1rem",
          fontSize: "1.35rem",
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        Now see Abraxas in an application.
      </h3>

      <div
        style={{
          borderRadius: 14,
          border: "1px solid rgba(76, 187, 146, 0.28)",
          background: "rgba(76, 187, 146, 0.06)",
          padding: "1rem 1.05rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.45rem" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>Example application</span>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(76, 187, 146, 0.95)",
            }}
          >
            Sandbox
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
          See how a protected action is permitted or blocked.
        </p>
      </div>

      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "0.85rem 1rem",
          marginBottom: "1rem",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>{access.title}</p>
        <p
          style={{
            margin: "0.35rem 0 0",
            fontSize: "1rem",
            fontWeight: 700,
            color:
              access.tone === "permit"
                ? "rgba(76, 187, 146, 0.95)"
                : access.tone === "deny"
                  ? "var(--danger, #f87171)"
                  : "var(--text-primary)",
          }}
        >
          {access.detail}
        </p>
      </div>

      {reachability === "checking" ? (
        <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>Checking example server…</p>
      ) : null}

      {reachability === "unreachable" ? (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.55rem", fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Start the reference application on this computer. Abraxas will not simulate a connected example.
          </p>
          <code
            style={{
              display: "block",
              fontFamily: MONO,
              fontSize: "0.68rem",
              padding: "0.65rem 0.75rem",
              borderRadius: 10,
              background: "var(--surface-inset)",
              marginBottom: "0.75rem",
              wordBreak: "break-all",
            }}
          >
            {REFERENCE_EXAMPLE_START_COMMAND}
          </code>
          <Btn size="sm" onClick={() => void runProbe()}>
            Check again
          </Btn>
        </div>
      ) : null}

      {reachability === "reachable" ? (
        <div style={{ marginBottom: "1rem" }}>
          {!callbackReady ? (
            <p style={{ margin: "0 0 0.65rem", fontSize: "0.82rem", color: "var(--warning, #f59e0b)", lineHeight: 1.45 }}>
              Point your sandbox callback to the example server before you run a verification there.
            </p>
          ) : null}
          <p style={{ margin: "0 0 0.65rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
            Open the example on this computer, create a verification request, and return here. Outcomes update from
            real enforcement evidence only.
          </p>
          <p style={{ margin: "0 0 0.75rem", fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-muted)" }}>
            {REFERENCE_EXAMPLE_APP_URL}
          </p>
          <Btn size="sm" disabled={pollBusy} onClick={() => void pollEnforcement()}>
            {pollBusy ? "Checking…" : "Refresh outcome"}
          </Btn>
        </div>
      ) : null}

      {pollError ? (
        <p style={{ fontSize: "0.72rem", color: "var(--danger, #f87171)", marginBottom: "0.75rem" }}>{pollError}</p>
      ) : null}

      <Btn size="sm" variant="ghost" onClick={onBack}>
        Connect your website
      </Btn>
    </div>
  );
}
