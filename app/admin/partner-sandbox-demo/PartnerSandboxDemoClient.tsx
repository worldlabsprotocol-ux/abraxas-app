"use client";
// FILE: app/admin/partner-sandbox-demo/PartnerSandboxDemoClient.tsx

import { useState } from "react";
import Link from "next/link";
import {
  DEMO_SANDBOX_PARTNER_ID,
  DEMO_SANDBOX_POLICY_ID,
} from "@/lib/demo/partnerSandboxDemoBoundaries";
import { DEMO_COMPLETION_NEUTRAL_OPS_NOTE } from "@/lib/demo/partnerSandboxDemoViews";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";
const WARN = "#F59E0B";

type StepState = "idle" | "loading" | "done" | "error";

export function PartnerSandboxDemoClient() {
  const [pin, setPin] = useState("");
  const [passport, setPassport] = useState<Record<string, unknown> | null>(null);
  const [evaluation, setEvaluation] = useState<Record<string, unknown> | null>(null);
  const [issuance, setIssuance] = useState<Record<string, unknown> | null>(null);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Record<string, StepState>>({
    passport: "idle",
    evaluate: "idle",
    complete: "idle",
    validate: "idle",
  });

  const headers = { "x-admin-pin": pin };

  async function loadPassport() {
    setError("");
    setStep((s) => ({ ...s, passport: "loading" }));
    try {
      const res = await fetch("/api/admin/partner-sandbox-demo/status", { headers });
      const json = await res.json() as { passport?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load passport status");
      setPassport(json.passport ?? null);
      setStep((s) => ({ ...s, passport: "done" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passport status failed");
      setStep((s) => ({ ...s, passport: "error" }));
    }
  }

  async function runEvaluate() {
    setError("");
    setStep((s) => ({ ...s, evaluate: "loading" }));
    try {
      const res = await fetch("/api/admin/partner-sandbox-demo/evaluate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json() as { evaluation?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Evaluation failed");
      setEvaluation(json.evaluation ?? null);
      setStep((s) => ({ ...s, evaluate: "done" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
      setStep((s) => ({ ...s, evaluate: "error" }));
    }
  }

  async function runComplete() {
    setError("");
    setStep((s) => ({ ...s, complete: "loading" }));
    try {
      const res = await fetch("/api/admin/partner-sandbox-demo/complete", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json() as { issuance?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Receipt issuance failed");
      setIssuance(json.issuance ?? null);
      setStep((s) => ({ ...s, complete: "done" }));
      const receiptId = (json.issuance as { receipt_id?: string } | undefined)?.receipt_id;
      if (receiptId) await runValidate(receiptId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Receipt issuance failed");
      setStep((s) => ({ ...s, complete: "error" }));
    }
  }

  async function runValidate(receiptId: string) {
    setStep((s) => ({ ...s, validate: "loading" }));
    try {
      const res = await fetch(
        `/api/admin/partner-sandbox-demo/validate?receipt_id=${encodeURIComponent(receiptId)}`,
        { headers },
      );
      const json = await res.json() as { receipt?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Validation failed");
      setReceipt(json.receipt ?? null);
      setStep((s) => ({ ...s, validate: "done" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
      setStep((s) => ({ ...s, validate: "error" }));
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: WARN, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            Admin · Synthetic sandbox demonstration
          </div>
          <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
            Partner Sandbox Demo
          </h1>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
            Five-minute walkthrough of policy evaluation and signed decision receipts using production code paths.
            Synthetic sandbox holder using the same policy evaluation and signed-receipt implementation.
            Partner <code>{DEMO_SANDBOX_PARTNER_ID}</code> · Policy <code>{DEMO_SANDBOX_POLICY_ID}</code>.
          </p>
          <Link href="/admin/partners" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
            ← Partners admin
          </Link>
        </div>

        <label style={{ display: "block", marginBottom: "1rem" }}>
          <span style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>Admin PIN</span>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            style={{
              display: "block",
              marginTop: 6,
              width: "100%",
              maxWidth: 280,
              padding: "0.55rem 0.65rem",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#11141a",
              color: "#fff",
              fontFamily: MONO,
              fontSize: "0.8rem",
            }}
          />
        </label>

        {error ? <p style={{ color: "#f87171", fontFamily: FONT, fontSize: "0.8rem" }}>{error}</p> : null}

        <DemoStep
          title="Step 1 — Demo Passport"
          description="Pre-provisioned synthetic sandbox holder. Credential availability only — no PII."
          state={step.passport}
          onRun={loadPassport}
          payload={passport}
        />

        <DemoStep
          title="Step 2 — Partner policy request"
          description="Is this sandbox holder verified and eligible under this policy? (No age-21 claim — sandbox policy has no minimum_age rule.)"
          state={step.evaluate}
          onRun={runEvaluate}
          payload={evaluation}
        />

        <DemoStep
          title="Step 3–4 — Evaluate, complete, and issue receipt"
          description={`Uses evaluateSubjectPolicy and issuePartnerSessionReceipt (production Partner Flow receipt service). ${DEMO_COMPLETION_NEUTRAL_OPS_NOTE}`}
          state={step.complete}
          onRun={runComplete}
          payload={issuance}
        />

        <DemoStep
          title="Step 5 — Public validation"
          description="Independent public receipt view — decision, policy, receipt ID, timestamps, signature validity, live validity."
          state={step.validate}
          onRun={() => {
            const id = (issuance as { receipt_id?: string } | null)?.receipt_id;
            if (id) void runValidate(id);
          }}
          payload={receipt}
          hideButton={!issuance}
        />
      </div>
    </div>
  );
}

function DemoStep({
  title,
  description,
  state,
  onRun,
  payload,
  hideButton,
}: {
  title: string;
  description: string;
  state: StepState;
  onRun: () => void;
  payload: Record<string, unknown> | null;
  hideButton?: boolean;
}) {
  return (
    <section
      style={{
        marginBottom: "1rem",
        padding: "1rem",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <h2 style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, margin: "0 0 0.35rem" }}>{title}</h2>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.55)", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
        {description}
      </p>
      {!hideButton ? (
        <button
          type="button"
          onClick={onRun}
          disabled={state === "loading"}
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: 8,
            border: "none",
            background: ACCENT,
            color: "#04120e",
            fontFamily: FONT,
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: state === "loading" ? "wait" : "pointer",
            opacity: state === "loading" ? 0.7 : 1,
          }}
        >
          {state === "loading" ? "Running…" : "Run step"}
        </button>
      ) : null}
      {payload ? (
        <pre
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            borderRadius: 8,
            background: "#0d1016",
            fontFamily: MONO,
            fontSize: "0.68rem",
            overflow: "auto",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
