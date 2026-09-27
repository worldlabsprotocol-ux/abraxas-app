"use client";
// FILE: app/admin/support/page.tsx
// Operator inbox for session-bound Passport holder support requests.

import { useCallback, useEffect, useState } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { ContentCard, PageHeader } from "@/components/redesign/RedesignContent";
import { adminFetch } from "@/lib/admin/adminFetch";
import {
  PASSPORT_SUPPORT_STATUSES,
  type PassportSupportStatus,
} from "@/lib/passport/passportSupport";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

interface SupportRequest {
  id: string;
  reference: string;
  email: string;
  issue_type: string;
  issue_label: string;
  status: PassportSupportStatus;
  status_label: string;
  message: string;
  submitted_at: string;
}

export default function AdminPassportSupportPage() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/passport-support");
      const data = await res.json() as { error?: string; requests?: SupportRequest[] };
      if (!res.ok || !data.requests) {
        setError(data.error ?? "Support queue is unavailable.");
        return;
      }
      setRequests(data.requests);
    } catch {
      setError("Support queue is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function updateStatus(id: string, status: PassportSupportStatus) {
    setUpdatingId(id);
    setError("");
    try {
      const res = await adminFetch("/api/admin/passport-support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Status update failed.");
        return;
      }
      await refresh();
    } catch {
      setError("Status update failed.");
    } finally {
      setUpdatingId("");
    }
  }

  const openCount = requests.filter(request => request.status !== "resolved").length;

  return (
    <RedesignPage accent="admin" maxWidth={980}>
      <PageHeader
        eyebrow="Admin · Passport"
        title="Holder support"
        subtitle="Review account help requests and publish a clear status back to the holder’s Passport."
      />

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <span style={summaryStyle}>{openCount} open</span>
        <span style={summaryStyle}>{requests.length} total</span>
        <button type="button" onClick={() => void refresh()} disabled={loading} style={refreshStyle}>
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.76rem", color: "#FCA5A5", margin: "0 0 0.8rem" }}>
          {error}
        </p>
      )}

      <ContentCard title="Support inbox">
        {loading ? (
          <p role="status" style={emptyStyle}>Loading holder requests…</p>
        ) : requests.length === 0 ? (
          <p style={emptyStyle}>No Passport support requests yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {requests.map(request => (
              <article key={request.id} style={{
                padding: "0.9rem", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--surface)",
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", gap: "0.75rem",
                  alignItems: "flex-start", flexWrap: "wrap", marginBottom: "0.55rem",
                }}>
                  <div>
                    <h2 style={{ fontFamily: FONT, fontSize: "0.9rem", margin: "0 0 0.2rem", color: "var(--text-primary)" }}>
                      {request.issue_label}
                    </h2>
                    <code style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                      {request.reference}
                    </code>
                  </div>
                  <span style={{
                    padding: "0.22rem 0.5rem", borderRadius: 999,
                    border: "1px solid rgba(16,185,129,0.35)",
                    background: "rgba(16,185,129,0.08)", color: "#6EE7B7",
                    fontFamily: FONT, fontSize: "0.64rem", fontWeight: 700,
                  }}>
                    {request.status_label}
                  </span>
                </div>

                <dl style={{
                  display: "grid", gridTemplateColumns: "auto 1fr",
                  gap: "0.25rem 0.65rem", margin: "0 0 0.65rem",
                  fontFamily: FONT, fontSize: "0.72rem", lineHeight: 1.5,
                }}>
                  <dt style={{ color: "var(--text-muted)" }}>Account</dt>
                  <dd style={{ margin: 0, color: "var(--text-secondary)" }}>{request.email}</dd>
                  <dt style={{ color: "var(--text-muted)" }}>Submitted</dt>
                  <dd style={{ margin: 0, color: "var(--text-secondary)" }}>
                    {new Date(request.submitted_at).toLocaleString()}
                  </dd>
                </dl>

                <div style={{
                  padding: "0.7rem", borderRadius: 9,
                  background: "var(--surface-inset)", border: "1px solid var(--border)",
                  fontFamily: FONT, fontSize: "0.74rem", lineHeight: 1.55,
                  color: "var(--text-secondary)", whiteSpace: "pre-wrap",
                }}>
                  {request.message || "No message was stored."}
                </div>

                <div aria-label={`Status for ${request.reference}`} style={{
                  display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.7rem",
                }}>
                  {PASSPORT_SUPPORT_STATUSES.map(status => (
                    <button
                      key={status.value}
                      type="button"
                      disabled={updatingId === request.id || request.status === status.value}
                      onClick={() => void updateStatus(request.id, status.value)}
                      style={{
                        padding: "0.35rem 0.6rem", borderRadius: 999,
                        border: request.status === status.value
                          ? "1px solid var(--accent)"
                          : "1px solid var(--border-strong)",
                        background: request.status === status.value
                          ? "rgba(16,185,129,0.12)"
                          : "transparent",
                        color: request.status === status.value
                          ? "#6EE7B7"
                          : "var(--text-secondary)",
                        fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700,
                        cursor: request.status === status.value ? "default" : "pointer",
                        opacity: updatingId === request.id ? 0.6 : 1,
                      }}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </ContentCard>
    </RedesignPage>
  );
}

const summaryStyle: React.CSSProperties = {
  padding: "0.32rem 0.6rem", borderRadius: 999,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text-secondary)", fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
};

const refreshStyle: React.CSSProperties = {
  ...summaryStyle, marginLeft: "auto", color: "var(--accent)", cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0,
};
