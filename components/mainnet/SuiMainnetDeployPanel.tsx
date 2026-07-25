"use client";
// FILE: components/mainnet/SuiMainnetDeployPanel.tsx
// Live Sui mainnet deploy checklist. gates #2 audit + #3 publish.

import { useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

interface Step {
  id: string;
  label: string;
  status: "complete" | "ready" | "blocked" | "action_required";
  detail: string;
  command?: string;
}

interface PathResponse {
  summary: string;
  ready_for_mainnet_cutover: boolean;
  mainnet_gate_3_live?: boolean;
  steps: Step[];
  next_actions: string[];
  deploy_commands?: { publish: string; mint_cap: string };
}

const STATUS_COLOR: Record<Step["status"], string> = {
  complete: "#10B981",
  ready: "#60A5FA",
  action_required: "#F59E0B",
  blocked: "#6B7280",
};

const STATUS_LABEL: Record<Step["status"], string> = {
  complete: "Done",
  ready: "Ready",
  action_required: "Action",
  blocked: "Blocked",
};

export function SuiMainnetDeployPanel() {
  const [data, setData] = useState<PathResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sui/mainnet/readiness")
      .then(r => r.json())
      .then(setData)
      .catch(() => setError("Could not load Sui mainnet path"));
  }, []);

  if (error) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)" }}>{error}</p>
    );
  }

  if (!data) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
        Loading Sui mainnet path…
      </p>
    );
  }

  const done = data.steps.filter(s => s.status === "complete").length;

  return (
    <section
      aria-labelledby="sui-mainnet-path-heading"
      style={{
        marginBottom: "1.5rem",
        padding: "1.15rem 1.25rem",
        borderRadius: 16,
        border: "1px solid rgba(16,185,129,0.35)",
        background: "rgba(16,185,129,0.06)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "#34D399", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            Sui mainnet path
          </div>
          <h2 id="sui-mainnet-path-heading" style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>
            Gates #2 + #3. audit then deploy
          </h2>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
            {data.summary}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {done}/{data.steps.length}
          </div>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>steps complete</div>
        </div>
      </div>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {data.steps.map((step, i) => (
          <li
            key={step.id}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr auto",
              gap: "0.65rem",
              alignItems: "start",
              padding: "0.65rem 0.75rem",
              borderRadius: 12,
              background: "var(--surface-raised)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--text-secondary)", paddingTop: 2 }}>
              {i + 1}
            </span>
            <div>
              <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                {step.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                {step.detail}
              </div>
              {step.command ? (
                <code style={{ display: "block", marginTop: 6, fontFamily: MONO, fontSize: "0.72rem", color: "#A7F3D0", wordBreak: "break-all" }}>
                  {step.command}
                </code>
              ) : null}
            </div>
            <span
              style={{
                fontFamily: FONT,
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: STATUS_COLOR[step.status],
                whiteSpace: "nowrap",
              }}
            >
              {STATUS_LABEL[step.status]}
            </span>
          </li>
        ))}
      </ol>

      {data.next_actions.length > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Next actions
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {data.next_actions.map(a => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
        <Btn href="/security" variant="secondary" size="sm">
          Audit tracker
        </Btn>
        <Btn href="/api/sui/mainnet/readiness" variant="ghost" size="sm">
          API checklist
        </Btn>
        <Btn href="/docs/sui" variant="ghost" size="sm">
          Sui docs
        </Btn>
      </div>
    </section>
  );
}
