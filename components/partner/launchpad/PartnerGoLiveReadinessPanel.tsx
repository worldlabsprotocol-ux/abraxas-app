"use client";
// FILE: components/partner/launchpad/PartnerGoLiveReadinessPanel.tsx
// Go-live summary and reviewed Production-access request. No key issuance.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { GO_LIVE_NOTE_MAX_CHARS, GO_LIVE_REVIEW_ENTRY } from "@/lib/partner/launchpad/goLiveReadiness/contract";
import type { GoLiveReadinessView } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

function tone(status: string): string {
  if (status === "pass" || status === "approved_for_production" || status === "ready_to_request_review") return "#10B981";
  if (status === "under_review" || status === "not_evidenced" || status === "not_selected") return "#94a3b8";
  return "#f59e0b";
}

export function PartnerGoLiveReadinessPanel({
  applicationId,
  onChanged,
}: {
  applicationId: string;
  onChanged?: () => void;
}) {
  const [view, setView] = useState<GoLiveReadinessView | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/go-live`, {
        credentials: "include",
      });
      const data = await res.json() as GoLiveReadinessView & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not load go-live readiness");
        setView(null);
        return;
      }
      setView(data);
    } catch {
      setError("Could not load go-live readiness");
    }
  }, [applicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function requestReview() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/go-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ partner_note: note.trim() || undefined }),
      });
      const data = await res.json() as { error?: string; request?: GoLiveReadinessView["request"] };
      if (!res.ok) {
        setError(data.error ?? "Could not submit the review request");
        await refresh();
        return;
      }
      await refresh();
      onChanged?.();
    } catch {
      setError("Could not submit the review request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentCard title="Go-live readiness">
      <p style={{ ...body, marginBottom: "0.75rem" }}>
        Server-derived checks for this sandbox app. A request asks a reviewer to consider Production access. It does not activate Production or issue a key.
      </p>
      {error && <p style={{ ...body, color: "#ef4444", marginBottom: "0.65rem" }}>{error}</p>}
      {view && (
        <>
          <p style={{ ...body, fontWeight: 700, color: tone(view.lifecycle), marginBottom: "0.65rem" }}>
            {view.lifecycle_label}
          </p>
          <p style={{ ...body, marginBottom: "0.75rem" }}>
            Policy <code style={{ fontFamily: MONO }}>{view.policy_id}</code> · v{view.policy_version}
            {" · "}sandbox key {view.sandbox_key_configured ? "configured" : "missing"}
            {" · "}
            <Link href={`/developers/launchpad?app=${encodeURIComponent(applicationId)}&view=versions`} style={{ color: "var(--accent)", fontWeight: 700 }}>
              Policy version
            </Link>
          </p>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            {view.checks.filter((check) => check.status !== "not_selected").map((check) => (
              <div key={check.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700 }}>
                  <span>{check.label}</span>
                  <span style={{ color: tone(check.status) }}>{check.status.replace(/_/g, " ")}</span>
                </div>
                <p style={{ ...body, marginTop: "0.3rem" }}>{check.next_step}</p>
                {check.status === "action_required" && (
                  <Link href={check.href} style={{ color: "var(--accent)", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700 }}>
                    Open next step
                  </Link>
                )}
              </div>
            ))}
          </div>
          {view.next_steps.length > 0 && view.lifecycle === "needs_setup" && (
            <ul style={{ ...body, margin: "0.85rem 0 0", paddingLeft: "1.1rem" }}>
              {view.next_steps.map((step, index) => (
                <li key={`${step.id}-${index}`}>
                  {step.detail}{" "}
                  <Link href={step.href} style={{ color: "var(--accent)", fontWeight: 700 }}>Open</Link>
                </li>
              ))}
            </ul>
          )}
          {view.request && (
            <p style={{ ...body, marginTop: "0.85rem" }}>
              Existing request {view.request.status.replace(/_/g, " ")}
              {view.request.status === "pending" ? ". A reviewer decides Production access outside this form." : ""}
              {view.request.status === "approved" ? ". Production remains an operator decision already recorded for this app." : ""}
              {view.request.status === "rejected" ? ". Finish the next steps, then request review again." : ""}
            </p>
          )}
          {view.can_request_review && (
            <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.55rem" }}>
              <label style={{ ...body, fontWeight: 700 }}>
                Optional partner note
                <textarea
                  value={note}
                  maxLength={GO_LIVE_NOTE_MAX_CHARS}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "0.35rem",
                    fontFamily: FONT,
                    fontSize: "0.78rem",
                    padding: "0.55rem",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-primary)",
                  }}
                />
              </label>
              <Btn size="sm" onClick={() => void requestReview()} disabled={busy}>
                {GO_LIVE_REVIEW_ENTRY}
              </Btn>
            </div>
          )}
          {!view.can_request_review && view.lifecycle === "needs_setup" && (
            <p style={{ ...body, marginTop: "0.85rem" }}>
              Finish the next steps above, then {GO_LIVE_REVIEW_ENTRY.toLowerCase()}.
            </p>
          )}
          <p style={{ ...body, marginTop: "0.85rem" }}>{view.production.notice}</p>
        </>
      )}
    </ContentCard>
  );
}
