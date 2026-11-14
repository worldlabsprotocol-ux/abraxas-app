"use client";
// FILE: components/verify/PortableIndependentVerifyPanel.tsx
// Verification-first default — synthetic portable bundle, no Abraxas account.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { StatusBanner } from "@/components/ui/StatusBanner";
import type { IndependentVerificationResult } from "@abraxas/independent-verifier";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

type DemoPayload = {
  ok: boolean;
  manifest?: {
    receipt_id: string;
    partner_id: string;
    policy_id: string;
    label: string;
    not_for_production: boolean;
  };
  journey_steps?: Array<{ step: number; title: string; body: string }>;
  issuance_note?: string;
  status_snapshot_note?: string;
  download_hints?: { repo_relative_dir: string; npm_package: string };
};

type VerifyPayload = {
  ok: boolean;
  scenario: string;
  next_action: string;
  verification: IndependentVerificationResult;
  error?: string;
};

function PhaseList({ verification }: { verification: IndependentVerificationResult }) {
  return (
    <ul style={{ margin: "0.75rem 0 0", padding: 0, listStyle: "none", display: "grid", gap: "0.45rem" }}>
      {verification.phases.map((phase) => (
        <li
          key={phase.id}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "0.65rem",
            padding: "0.55rem 0.7rem",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.62rem",
              fontWeight: 800,
              textTransform: "uppercase",
              color:
                phase.status === "pass"
                  ? "#10B981"
                  : phase.status === "fail"
                    ? "#f87171"
                    : "var(--text-muted)",
            }}
          >
            {phase.status}
          </span>
          <div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {phase.id.replace(/_/g, " ")}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0.2rem 0 0", lineHeight: 1.45 }}>
              {phase.detail}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PortableIndependentVerifyPanel() {
  const [demo, setDemo] = useState<DemoPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/developers/verification-first/demo", { cache: "no-store" });
        const json = (await res.json()) as DemoPayload;
        if (!res.ok || !json.ok) throw new Error("demo_unavailable");
        if (!cancelled) setDemo(json);
      } catch {
        if (!cancelled) setLoadError("Could not load the non-production verification bundle.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runScenario = useCallback(async (scenario: "valid" | "wrong_audience" | "revoked") => {
    setRunning(scenario);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/developers/verification-first/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const json = (await res.json()) as VerifyPayload;
      if (!res.ok || !json.ok) throw new Error(json.error ?? "verify_failed");
      setResult(json);
    } catch {
      setErr("Verification run failed. Try again or use the CLI example in the repo.");
    } finally {
      setRunning(null);
    }
  }, []);

  if (loadError) {
    return (
      <StatusBanner tone="error" title="Bundle unavailable">
        {loadError} You can still verify offline with committed fixtures and{" "}
        <code style={{ fontFamily: MONO, fontSize: "0.76rem" }}>@abraxas/independent-verifier</code>{" "}
        (see{" "}
        <Link href="/developers/institutional-verification" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
          SDK workspace
        </Link>
        ).
      </StatusBanner>
    );
  }

  if (!demo?.manifest) {
    return <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading verification bundle…</p>;
  }

  const acceptable = result?.verification.currently_acceptable;

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <StatusBanner tone="info" title="Hosted demo only — not required for verification">
        {demo.issuance_note ??
          "Synthetic sandbox fixtures only. Live issuance uses an authorized issuer; hosted export is optional."}{" "}
        Production relying parties verify with{" "}
        <code style={{ fontFamily: MONO, fontSize: "0.76rem" }}>@abraxas/independent-verifier</code> and pinned
        artifacts in their own environment. This page&apos;s API calls explain the flow; they are not a trust root.
      </StatusBanner>

      <div className="abx-verify-independent-intro" style={{
        padding: "1rem 1.1rem",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
      }}>
        <p style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 0.35rem" }}>
          What this receipt proves
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-primary)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
          Policy <code style={{ fontFamily: MONO, fontSize: "0.76rem" }}>{demo.manifest.policy_id}</code> approved
          for partner <code style={{ fontFamily: MONO, fontSize: "0.76rem" }}>{demo.manifest.partner_id}</code>{" "}
          (receipt <code style={{ fontFamily: MONO, fontSize: "0.76rem" }}>{demo.manifest.receipt_id}</code>).
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
          {demo.status_snapshot_note}
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn
          size="sm"
          variant="primary"
          disabled={Boolean(running)}
          onClick={() => void runScenario("valid")}
        >
          {running === "valid" ? "Verifying…" : "Verify valid receipt"}
        </Btn>
        <Btn size="sm" variant="secondary" disabled={Boolean(running)} onClick={() => void runScenario("wrong_audience")}>
          Wrong partner scope
        </Btn>
        <Btn size="sm" variant="ghost" disabled={Boolean(running)} onClick={() => void runScenario("revoked")}>
          Revoked status
        </Btn>
      </div>

      {err && (
        <StatusBanner tone="error" title="Run failed">
          {err}
        </StatusBanner>
      )}

      {result?.verification && (
        <div>
          <div style={{
            padding: "0.85rem 1rem",
            borderRadius: 12,
            border: acceptable === "yes" ? "1px solid rgba(16,185,129,0.45)" : "1px solid rgba(248,113,113,0.45)",
            background: acceptable === "yes" ? "rgba(16,185,129,0.08)" : "rgba(248,113,113,0.06)",
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Currently acceptable: {acceptable ?? "indeterminate"}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
              {result.next_action}
            </p>
          </div>
          <PhaseList verification={result.verification} />
          {result.verification.failure_codes.length > 0 && (
            <p style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.65rem" }}>
              failure_codes: {result.verification.failure_codes.join(", ")}
            </p>
          )}
        </div>
      )}

      <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 0.5rem" }}>
          <strong style={{ color: "var(--text-primary)" }}>Standalone path (no Abraxas account):</strong> install{" "}
          <code style={{ fontFamily: MONO }}>{demo.download_hints?.npm_package ?? "@abraxas/independent-verifier"}</code>,
          pin trust material out-of-band, and run verification from fixtures under{" "}
          <code style={{ fontFamily: MONO }}>{demo.download_hints?.repo_relative_dir}</code> or your own portable bundle.
          Committed fixtures teach onboarding; fresh authoritative receipts require authorized issuance.
        </p>
        <p style={{ margin: 0 }}>
          Need hosted issuance later?{" "}
          <Link href="/docs/VERIFY_WITH_ABRAXAS_QUICKSTART" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
            Issuance quickstart
          </Link>
          {" · "}
          <Link href="/verify?mode=receipt" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
            Hosted receipt mirror
          </Link>
          {" · "}
          <Link href="/developers/institutional-verification" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
            SDK workspace
          </Link>
        </p>
      </div>
    </div>
  );
}