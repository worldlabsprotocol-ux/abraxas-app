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
  plainAcceptabilityLine,
  plainIssuerLine,
  plainVerificationVerdict,
  plainWhatItProves,
  type PlainVerificationVerdict,
} from "@/lib/partner/portableIndependentVerification/plainVerificationSummary";
import { INDEPENDENT_VERIFY_ENTRY_COPY } from "@/lib/integrate/partnerJourney";

const FONT = "'Inter',system-ui,sans-serif";

type DemoPayload = {
  ok: boolean;
  manifest?: { receipt_id: string; partner_id: string; policy_id: string };
  status_snapshot_note?: string;
};

type VerifyPayload = {
  ok: boolean;
  scenario?: string;
  next_action: string;
  verification: IndependentVerificationResult;
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

export function IndependentVerificationFlow() {
  const [demo, setDemo] = useState<DemoPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    verdict: PlainVerificationVerdict;
    what: string;
    issuer: string;
    acceptable: string;
    next: string;
    verification: IndependentVerificationResult;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteRaw, setPasteRaw] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/developers/verification-first/demo", { cache: "no-store" });
        const json = (await res.json()) as DemoPayload;
        if (!res.ok || !json.ok) throw new Error("demo_unavailable");
        if (!cancelled) setDemo(json);
      } catch {
        if (!cancelled) setLoadError("Demo example is not available right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyDemoResult = useCallback((payload: VerifyPayload) => {
    const verdict = plainVerificationVerdict(payload.verification, payload.scenario);
    const m = demo?.manifest;
    setResult({
      verdict,
      what: m
        ? plainWhatItProves({ policyId: m.policy_id, partnerId: m.partner_id })
        : "This receipt records a signed policy decision.",
      issuer: plainIssuerLine(payload.verification),
      acceptable: plainAcceptabilityLine(payload.verification),
      next: payload.next_action,
      verification: payload.verification,
    });
  }, [demo?.manifest]);

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
      if (!res.ok || !json.ok) throw new Error("verify_failed");
      applyDemoResult(json);
    } catch {
      setErr("Could not run the demo check. Try again in a moment.");
    } finally {
      setRunning(false);
    }
  }, [applyDemoResult]);

  const runExample = useCallback(async (scenario: "wrong_audience" | "revoked") => {
    setRunning(true);
    setErr(null);
    try {
      const res = await fetch("/api/developers/verification-first/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const json = (await res.json()) as VerifyPayload & { ok: boolean };
      if (!res.ok || !json.ok) throw new Error("verify_failed");
      applyDemoResult({ ...json, scenario });
    } catch {
      setErr("Example could not run.");
    } finally {
      setRunning(false);
    }
  }, [applyDemoResult]);

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
      const json = (await res.json()) as {
        ok: boolean;
        verdict: PlainVerificationVerdict;
        plain?: { what_it_proves: string; issuer: string; acceptable: string; next_action: string };
        verification: IndependentVerificationResult;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "invalid_bundle");
      setResult({
        verdict: json.verdict,
        what: json.plain?.what_it_proves ?? "",
        issuer: json.plain?.issuer ?? "",
        acceptable: json.plain?.acceptable ?? "",
        next: json.plain?.next_action ?? "",
        verification: json.verification,
      });
    } catch {
      setErr("Could not verify that bundle. Check the JSON is a complete portable verification bundle.");
    } finally {
      setRunning(false);
    }
  }, [pasteRaw]);

  const reset = () => {
    setResult(null);
    setErr(null);
    setShowPaste(false);
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

      {loadError && (
        <StatusBanner tone="error" title="Demo unavailable">
          {loadError}
        </StatusBanner>
      )}

      {!result && (
        <div style={{ display: "grid", gap: "0.65rem" }}>
          <Btn size="md" variant="primary" disabled={running || Boolean(loadError)} onClick={() => void runDemo()}>
            {running && !showPaste ? "Checking…" : INDEPENDENT_VERIFY_ENTRY_COPY.useDemoLabel}
          </Btn>
          <Btn
            size="md"
            variant="secondary"
            disabled={running}
            onClick={() => setShowPaste((v) => !v)}
          >
            {INDEPENDENT_VERIFY_ENTRY_COPY.pasteLabel}
          </Btn>
        </div>
      )}

      {showPaste && !result && (
        <div style={{ display: "grid", gap: "0.5rem" }}>
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
          <Btn size="sm" variant="primary" disabled={running || !pasteRaw.trim()} onClick={() => void runPaste()}>
            {running ? "Checking…" : "Check this bundle"}
          </Btn>
        </div>
      )}

      {err && (
        <StatusBanner tone="error" title="Something went wrong">
          {err}
        </StatusBanner>
      )}

      {result && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <VerdictBanner verdict={result.verdict} />
          <section style={{ display: "grid", gap: "0.65rem" }}>
            <ResultRow label="What it proves" value={result.what} />
            <ResultRow label="Who issued it" value={result.issuer} />
            <ResultRow label="Currently acceptable" value={result.acceptable} />
            <ResultRow label="What to do next" value={result.next} />
          </section>

          <details>
            <summary style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", cursor: "pointer" }}>
              Advanced details
            </summary>
            <div style={{ paddingTop: "0.65rem" }}>
              {demo?.status_snapshot_note && (
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.65rem", lineHeight: 1.5 }}>
                  {demo.status_snapshot_note}
                </p>
              )}
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.5rem" }}>
                Hosted checks are for learning only. Production teams run{" "}
                <code style={{ fontSize: "0.7rem" }}>@abraxas/independent-verifier</code> on their own systems with a trust anchor they pin out-of-band.
              </p>
              <PhaseList verification={result.verification} />
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.75rem 0 0.5rem" }}>
                Example outcomes (demo fixtures):
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                <Btn size="sm" variant="ghost" disabled={running} onClick={() => void runExample("wrong_audience")}>
                  Wrong audience example
                </Btn>
                <Btn size="sm" variant="ghost" disabled={running} onClick={() => void runExample("revoked")}>
                  Revoked example
                </Btn>
              </div>
            </div>
          </details>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <Btn size="sm" variant="primary" onClick={reset}>
              Try another receipt
            </Btn>
            <Btn href="/developers/institutional-verification" size="sm" variant="secondary">
              See integration docs
            </Btn>
          </div>
        </div>
      )}

      {!result && (
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