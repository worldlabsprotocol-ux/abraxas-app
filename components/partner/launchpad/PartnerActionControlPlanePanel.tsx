"use client";
// FILE: components/partner/launchpad/PartnerActionControlPlanePanel.tsx
// Launchpad operator view for receipt-gated integrations.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  ACTION_CONTROL_PLANE_DOCS_PATH,
  ACTION_CONTROL_PLANE_NOT_PARALLEL,
  ACTION_CONTROL_PLANE_PRODUCTION,
} from "@/lib/partner/actionControlPlane/contract";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface CapabilityRow {
  id: string;
  label: string;
  configured: boolean;
  readiness: string;
  reason: string;
  next_step: string;
  href: string;
}

interface ChecklistRow {
  id: string;
  label: string;
  status: string;
  reason: string;
  next_step: string;
}

interface LifecycleRow {
  id: string;
  lane: string;
  status: string;
  reason: string;
  count: number;
  last_opaque_id: string | null;
}

interface ControlPlaneView {
  application: {
    application_name: string;
    policy_id: string;
    policy_version: number;
    policy_template_id: string;
    environment: string;
  };
  capabilities: CapabilityRow[];
  checklist: ChecklistRow[];
  lifecycle: LifecycleRow[];
  overall: string;
}

function tone(status: string): string {
  if (status === "ready" || status === "ok" || status === "optional") return "#10B981";
  if (status === "action_required" || status === "not_run" || status === "attention" || status === "idle") return "#f59e0b";
  return "#ef4444";
}

export function PartnerActionControlPlanePanel({ applicationId }: { applicationId: string }) {
  const [view, setView] = useState<ControlPlaneView | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/action-control-plane`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(String(data.error ?? data.code ?? "Could not load the action control plane"));
      return;
    }
    setError("");
    setView(data as ControlPlaneView);
  }, [applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ContentCard title="Partner Action Control Plane">
      <p style={body}>
        {ACTION_CONTROL_PLANE_NOT_PARALLEL} {ACTION_CONTROL_PLANE_PRODUCTION.notice}
      </p>
      {error && <p role="alert" style={{ ...body, color: "#ef4444" }}>{error}</p>}
      {view && (
        <>
          <p style={body}>
            Active policy <code style={{ fontFamily: MONO }}>{view.application.policy_id}</code>
            {" "}v{view.application.policy_version}
            {" · "}
            {view.application.policy_template_id}
            {" · "}
            {view.application.environment}
            {" · "}
            overall {view.overall.replace(/_/g, " ")}
          </p>
          <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.85rem" }}>
            {view.capabilities.map((row) => (
              <div key={row.id} style={card}>
                <div style={rowHead}>
                  <span>{row.label}</span>
                  <span style={{ color: tone(row.readiness) }}>{row.readiness.replace(/_/g, " ")}</span>
                </div>
                <p style={{ ...body, margin: "0.3rem 0 0" }}>{row.next_step}</p>
                <p style={{ ...body, margin: "0.2rem 0 0", fontSize: "0.68rem" }}>
                  Reason {row.reason.replace(/_/g, " ")}
                  {" · "}
                  <Link href={row.href} style={{ color: "var(--accent)" }}>Docs</Link>
                </p>
              </div>
            ))}
          </div>
          <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)" }}>Sandbox integration health</p>
          <div style={{ display: "grid", gap: "0.4rem", marginBottom: "0.85rem" }}>
            {view.checklist.map((row) => (
              <div key={row.id} style={card}>
                <div style={rowHead}>
                  <span>{row.label}</span>
                  <span style={{ color: tone(row.status) }}>{row.status.replace(/_/g, " ")}</span>
                </div>
                <p style={{ ...body, margin: "0.3rem 0 0" }}>{row.next_step}</p>
              </div>
            ))}
          </div>
          <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)" }}>Safe action lifecycle</p>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {view.lifecycle.map((row) => (
              <div key={row.lane} style={card}>
                <div style={rowHead}>
                  <span>{row.lane.replace(/_/g, " ")}</span>
                  <span style={{ color: tone(row.status) }}>{row.status}</span>
                </div>
                <p style={{ ...body, margin: "0.3rem 0 0" }}>
                  {row.reason.replace(/_/g, " ")}
                  {" · "}
                  {row.count} events
                  {row.last_opaque_id ? ` · ${row.last_opaque_id}` : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Btn size="sm" variant="secondary" onClick={() => void load()}>Refresh control plane</Btn>
        <Btn size="sm" variant="ghost" href={ACTION_CONTROL_PLANE_DOCS_PATH}>Control plane docs</Btn>
      </div>
    </ContentCard>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: "0 0 0.75rem",
};

const card: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "0.65rem",
};

const rowHead: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "0.5rem",
  fontFamily: FONT,
  fontSize: "0.74rem",
  fontWeight: 700,
};
