"use client";
// FILE: components/verify/IndependentVerificationFlow.tsx
// Default /verify experience — plain language, two choices, no tab maze.

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import type { IndependentVerificationResult } from "@abraxas/independent-verifier";
import type { PortableVerificationBundle } from "@/lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import {
  OFFLINE_INDEPENDENT_VERIFICATION_NOTE,
  type PlainResultSummary,
  type PlainVerificationVerdict,
} from "@/lib/partner/portableIndependentVerification/plainVerificationSummary";
import { INDEPENDENT_VERIFY_ENTRY_COPY } from "@/lib/integrate/partnerJourney";
import { VerificationFirstPartnerPathCard } from "@/components/verify/VerificationFirstPartnerPathCard";

const FONT = "'Inter',system-ui,sans-serif";

type VerifyPayload = {
  ok: boolean;
  scenario?: string;
  plain: PlainResultSummary;
  verification: IndependentVerificationResult;
  offline_verification_note?: string;
};

const VERDICT_TONE: Record<
  PlainVerificationVerdict,
  "success" | "pending" | "error"
> = {
  Valid: "success",
  "Needs fresh status": "pending",
  "Wrong audience": "error",
  Revoked: "error",
  "Not valid": "error",
};

function VerdictHero({ verdict }: { verdict: PlainVerificationVerdict }) {
  const tone = VERDICT_TONE[verdict];
  const colors = {
    success: { border: "rgba(16,185,129,0.45)", bg: "rgba(16,185,129,0.12)", text: "#10B981" },
    pending: { border: "rgba(245,158,11,0.45)", bg: "rgba(245,158,11,0.1)", text: "#F59E0B" },
    error: { border: "rgba(239,68,68,0.45)", bg: "rgba(239,68,68,0.1)", text: "#EF4444" },
  }[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "1.35rem 1.25rem",
        borderRadius: 14,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "0.35rem",
        }}
      >
        Verdict
      </div>
      <div
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.5rem, 5vw, 1.85rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: colors.text,
          lineHeight: 1.15,
        }}
      >
        {verdict}
      </div>
    </div>
  );
}

function PhaseList({ verification }: { verification: IndependentVerificationResult }) {
  return (
    <ul style={{ margin: "0.5rem 0 0", padding: 0, listStyle: "none", display: "grid", gap: "0.4rem" }}>
      {verification.phases.map((phase) => (
        <li key={phase.id} style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
          <strong style={{ color: "var(--text-primary)" }}>{phase.id.replace(/_/g, " ")}</strong>
          {" — "}
          {phase.status}
          {": "}
          {phase.detail}
        </li>
      ))}
    </ul>
  );
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return (
    <section>
      <h2
        style={{
          fontFamily: FONT,
          fontSize: "0.7rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          margin: "0 0 0.35rem",
        }}
      >
        {label}
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.9rem, 2.5vw, 0.95rem)",
          color: "var(--text-primary)",
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        {value}
      </p>
    </section>
  );
}

type Step = "choose" | "paste" | "result";

export function IndependentVerificationFlow() {
  const advancedId = useId();
  const [demoReady, setDemoReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [result, setResult] = useState<{
    plain: PlainResultSummary;
    verification: IndependentVerificationResult;
    offlineNote?: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pasteRaw, setPasteRaw] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/developers/verification-first/demo", { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean };
        if (!res.ok || !json.ok) throw new Error("demo_unavailable");
        if (!cancelled) setDemoReady(true);
      } catch {
        if (!cancelled) setLoadError("Demo example is not available right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyPayload = useCallback((json: VerifyPayload) => {
    setResult({
      plain: json.plain,
      verification: json.verification,
      offlineNote: json.offline_verification_note,
    });
    setStep("result");
    setErr(null);
  }, []);

  const runDemo = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setErr(null);
    setResult(null);
    setStep("result");
    try {
      const res = await fetch("/api/developers/verification-first/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "valid" }),
      });
      const json = (await res.json()) as VerifyPayload & { ok: boolean };
      if (!res.ok || !json.ok || !json.plain) throw new Error("verify_failed");
      applyPayload(json);
    } catch {
      setStep("choose");
      setErr("Could not reach the verification service. Check your connection and try again.");
    } finally {
      setRunning(false);
    }
  }, [applyPayload, running]);

  const runExample = useCallback(async (scenario: string) => {
    if (running) return;
    setRunning(true);
    setErr(null);
    try {
      const res = await fetch("/api/developers/verification-first/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const json = (await res.json()) as VerifyPayload & { ok: boolean };
      if (!res.ok || !json.ok || !json.plain) throw new Error("verify_failed");
      applyPayload(json);
    } catch {
      setErr("Example could not run.");
    } finally {
      setRunning(false);
    }
  }, [applyPayload, running]);

  const runPaste = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setErr(null);
    setResult(null);
    setStep("result");
    try {
      const bundle = JSON.parse(pasteRaw) as PortableVerificationBundle;
      const res = await fetch("/api/developers/verification-first/verify-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle }),
      });
      const json = (await res.json()) as VerifyPayload & { ok: boolean; error?: string };
      if (!res.ok || !json.ok || !json.plain) {
        const code = json.error ?? "invalid_bundle";
        setStep("paste");
        if (code === "invalid_json" || code === "invalid_portable_bundle") {
          setErr("That input is not a complete portable verification bundle.");
        } else if (code === "missing_trust_anchor") {
          setErr("The bundle is missing trust material.");
        } else {
          setErr("Could not verify that bundle.");
        }
        return;
      }
      applyPayload(json);
    } catch {
      setStep("paste");
      setErr("Could not read that JSON. Paste a complete portable verification bundle.");
    } finally {
      setRunning(false);
    }
  }, [applyPayload, pasteRaw, running]);

  const reset = () => {
    setResult(null);
    setErr(null);
    setStep("choose");
    setPasteRaw("");
  };

  return (
    <div style={{ display: "grid", gap: "1.15rem", maxWidth: 640, width: "100%" }}>
      {step !== "result" && (
        <header>
          <h1
            style={{
              fontFamily: FONT,
              fontSize: "clamp(1.4rem, 4vw, 1.75rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              margin: "0 0 0.5rem",
              lineHeight: 1.2,
            }}
          >
            {INDEPENDENT_VERIFY_ENTRY_COPY.title}
          </h1>
          <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
            {INDEPENDENT_VERIFY_ENTRY_COPY.subline}
          </p>
        </header>
      )}

      {loadError && step === "choose" && (
        <StatusBanner tone="error" title="Demo unavailable">
          {loadError}
        </StatusBanner>
      )}

      {running && step === "result" && !result && (
        <StatusBanner tone="info" title="Checking receipt…" loading>
          Running verification with the supplied evidence.
        </StatusBanner>
      )}

      {step === "choose" && !result && !running && (
        <div style={{ display: "grid", gap: "0.65rem" }}>
          <Btn size="md" variant="primary" disabled={!demoReady} onClick={() => void runDemo()}>
            {INDEPENDENT_VERIFY_ENTRY_COPY.useDemoLabel}
          </Btn>
          <Btn size="md" variant="secondary" onClick={() => setStep("paste")}>
            {INDEPENDENT_VERIFY_ENTRY_COPY.pasteLabel}
          </Btn>
        </div>
      )}

      {step === "paste" && !result && (
        <div style={{ display: "grid", gap: "0.65rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
            Paste your bundle, then run one check. Hosted paste uses the anchor inside the bundle — not independent pinning.
          </p>
          <textarea
            value={pasteRaw}
            onChange={(e) => setPasteRaw(e.target.value)}
            placeholder="Paste your portable verification bundle JSON here"
            rows={7}
            disabled={running}
            style={{
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.72rem",
              padding: "0.75rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface-inset)",
              color: "var(--text-primary)",
            }}
          />
          <Btn size="md" variant="primary" disabled={running || !pasteRaw.trim()} onClick={() => void runPaste()}>
            {running ? "Checking…" : "Check this bundle"}
          </Btn>
          <Btn size="sm" variant="ghost" disabled={running} onClick={() => setStep("choose")}>
            Back
          </Btn>
        </div>
      )}

      {err && (
        <StatusBanner
          tone="error"
          title="Something went wrong"
          action={
            err.includes("Try again") ? (
              <Btn size="sm" variant="secondary" disabled={running} onClick={() => void runDemo()}>
                Try again
              </Btn>
            ) : undefined
          }
        >
          {err}
        </StatusBanner>
      )}

      {result && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <VerdictHero verdict={result.plain.verdict} />
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <SummaryBlock label="What this means" value={result.plain.whatThisMeans} />
            <SummaryBlock label="What was checked" value={result.plain.whatWasChecked} />
            <SummaryBlock label="Important limitations" value={result.plain.limitations} />
            <SummaryBlock label="What to do next" value={result.plain.next} />
          </div>

          <Btn size="md" variant="primary" onClick={reset}>
            Try another receipt
          </Btn>

          <VerificationFirstPartnerPathCard />

          <details aria-labelledby={advancedId}>
            <summary
              id={advancedId}
              style={{
                fontFamily: FONT,
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "0.25rem 0",
              }}
            >
              Advanced details
            </summary>
            <div style={{ paddingTop: "0.65rem", display: "grid", gap: "0.75rem" }}>
              {result.plain.detailRows.map((row) => (
                <SummaryBlock key={row.label} label={row.label} value={row.value} />
              ))}
              <p
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  margin: 0,
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                }}
              >
                {result.plain.technicalIds}
              </p>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                {result.offlineNote ?? OFFLINE_INDEPENDENT_VERIFICATION_NOTE}
              </p>
              <PhaseList verification={result.verification} />
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
                More demo outcomes:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {["wrong_audience", "revoked", "stale_status", "tampered_signature"].map((scenario) => (
                  <Btn key={scenario} size="sm" variant="ghost" disabled={running} onClick={() => void runExample(scenario)}>
                    {scenario.replace(/_/g, " ")}
                  </Btn>
                ))}
              </div>
            </div>
          </details>
        </div>
      )}

      {step === "choose" && !result && (
        <VerificationFirstPartnerPathCard compact />
      )}

      {step === "choose" && !result && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          {INDEPENDENT_VERIFY_ENTRY_COPY.footerNote}{" "}
          <Link href="/verify?mode=developer" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
            Developer testing tools
          </Link>
        </p>
      )}
    </div>
  );
}