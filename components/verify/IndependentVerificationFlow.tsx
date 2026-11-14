"use client";
// FILE: components/verify/IndependentVerificationFlow.tsx
// Default /verify experience — plain language, two choices, no tab maze.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import type { IndependentVerificationResult } from "@abraxas/independent-verifier";
import type { PortableVerificationBundle } from "@/lib/partner/portableIndependentVerification/buildPortableVerificationBundle";
import {
  OFFLINE_INDEPENDENT_VERIFICATION_NOTE,
  type PlainVerificationVerdict,
} from "@/lib/partner/portableIndependentVerification/plainVerificationSummary";
import { INDEPENDENT_VERIFY_ENTRY_COPY } from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,sans-serif";

type PlainResult = {
  verdict: PlainVerificationVerdict;
  trustBoundary: string;
  rows: Array<{ label: string; value: string }>;
  next: string;
  technicalIds: string;
};

type VerifyPayload = {
  ok: boolean;
  scenario?: string;
  plain: PlainResult;
  verification: IndependentVerificationResult;
  offline_verification_note?: string;
};

function VerdictBanner({ verdict }: { verdict: PlainVerificationVerdict }) {
  const tone =
    verdict === "Valid" ? "success" : verdict === "Needs fresh status" ? "pending" : "error";
  return <StatusBanner tone={tone} title={verdict} />;
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

type Step = "choose" | "paste" | "result";

export function IndependentVerificationFlow() {
  const [demoReady, setDemoReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [result, setResult] = useState<{
    plain: PlainResult;
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
  }, []);

  const runDemo = useCallback(async () => {
    setRunning(true);
    setErr(null);
    setResult(null);
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
      setErr("Could not run the demo check. Try again in a moment.");
    } finally {
      setRunning(false);
    }
  }, [applyPayload]);

  const runExample = useCallback(async (scenario: string) => {
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
  }, [applyPayload]);

  const runPaste = useCallback(async () => {
    setRunning(true);
    setErr(null);
    setResult(null);
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
      setErr("Could not read that JSON. Paste a complete portable verification bundle.");
    } finally {
      setRunning(false);
    }
  }, [applyPayload, pasteRaw]);

  const reset = () => {
    setResult(null);
    setErr(null);
    setStep("choose");
    setPasteRaw("");
  };

  return (
    <div style={{ display: "grid", gap: "1.35rem", maxWidth: 640 }}>
      <header>
        <h1 style={{
          fontFamily: FONT,
          fontSize: "clamp(1.4rem, 4vw, 1.75rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
          lineHeight: 1.2,
        }}>
          {INDEPENDENT_VERIFY_ENTRY_COPY.title}
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
          {INDEPENDENT_VERIFY_ENTRY_COPY.subline}
        </p>
      </header>

      {loadError && step === "choose" && (
        <StatusBanner tone="error" title="Demo unavailable">
          {loadError}
        </StatusBanner>
      )}

      {step === "choose" && !result && (
        <div style={{ display: "grid", gap: "0.65rem" }}>
          <Btn size="md" variant="primary" disabled={running || !demoReady} onClick={() => void runDemo()}>
            {running ? "Checking…" : INDEPENDENT_VERIFY_ENTRY_COPY.useDemoLabel}
          </Btn>
          <Btn size="md" variant="secondary" disabled={running} onClick={() => setStep("paste")}>
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
            rows={8}
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
        <StatusBanner tone="error" title="Something went wrong">
          {err}
          {err.includes("Try again") ? null : (
            <span>
              {" "}
              <button
                type="button"
                onClick={() => setErr(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: FONT,
                  fontSize: "inherit",
                }}
              >
                Dismiss
              </button>
            </span>
          )}
        </StatusBanner>
      )}

      {result && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <VerdictBanner verdict={result.plain.verdict} />
          <StatusBanner tone="info" title="How this check ran">
            {result.plain.trustBoundary}
          </StatusBanner>
          <section style={{ display: "grid", gap: "0.65rem" }}>
            {result.plain.rows.map((row) => (
              <ResultRow key={row.label} label={row.label} value={row.value} />
            ))}
            <ResultRow label="What to do next" value={result.plain.next} />
          </section>

          <details>
            <summary style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", cursor: "pointer" }}>
              Advanced details
            </summary>
            <div style={{ paddingTop: "0.65rem", display: "grid", gap: "0.65rem" }}>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5, whiteSpace: "pre-line" }}>
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
              <Btn href="/developers/institutional-verification" size="sm" variant="secondary">
                See integration docs
              </Btn>
            </div>
          </details>

          <Btn size="md" variant="primary" onClick={reset}>
            Try another receipt
          </Btn>
        </div>
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

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
        {label}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-primary)", margin: "0.2rem 0 0", lineHeight: 1.5 }}>
        {value}
      </p>
    </div>
  );
}