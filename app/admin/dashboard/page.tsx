"use client";
// FILE: app/admin/dashboard/page.tsx
// Operator attention — restrained queue discovery, not an executive dashboard.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OperationalEmptyState } from "@/components/admin/operator/OperationalEmptyState";
import { OperationalErrorState } from "@/components/admin/operator/OperationalErrorState";
import { adminFetch } from "@/lib/admin/adminFetch";
import type { OperatorAttentionSnapshot, OperatorAttentionSource } from "@/lib/admin/operatorAttention";
import {
  attentionSourcesNeedingAction,
  attentionSourcesUnavailable,
} from "@/lib/admin/operatorAttention";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { ContentCard, PageHeader } from "@/components/redesign/RedesignContent";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

export default function AdminDashboardPage() {
  const [snapshot, setSnapshot] = useState<OperatorAttentionSnapshot | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await adminFetch("/api/admin/operator-attention");
      const data = await res.json() as OperatorAttentionSnapshot & { error?: string };
      if (!res.ok) {
        setSnapshot(null);
        setLoadError(data.error ?? "Attention snapshot unavailable.");
        return;
      }
      setSnapshot(data);
    } catch {
      setSnapshot(null);
      setLoadError("Attention snapshot unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const needingAction = snapshot ? attentionSourcesNeedingAction(snapshot) : [];
  const unavailable = snapshot ? attentionSourcesUnavailable(snapshot) : [];

  return (
    <RedesignPage accent="admin" maxWidth={920}>
      <PageHeader
        eyebrow="Admin · Operations"
        title="Needs attention"
        subtitle="Pending operator work across authoritative queues. Unavailable sources are shown separately — never as zero."
      />

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button type="button" onClick={() => void load()} disabled={loading} style={refreshStyle}>
          Refresh
        </button>
        {snapshot?.generated_at && (
          <span style={metaStyle}>
            Updated {new Date(snapshot.generated_at).toLocaleString()}
          </span>
        )}
      </div>

      {loadError && (
        <OperationalErrorState
          title="Could not load attention snapshot"
          message={loadError}
          onRetry={() => void load()}
        />
      )}

      {!loadError && loading && (
        <p role="status" style={mutedStyle}>Loading operator attention…</p>
      )}

      {!loadError && !loading && snapshot && (
        <>
          {needingAction.length > 0 ? (
            <ContentCard title="Queues with pending work">
              <div style={{ display: "grid", gap: "0.65rem" }}>
                {needingAction.map(source => (
                  <AttentionRow key={source.id} source={source} />
                ))}
              </div>
            </ContentCard>
          ) : (
            <OperationalEmptyState
              title="No pending operator work detected"
              body="All monitored queues report zero items needing action. This reflects backend counts only — unavailable sources are listed below if any."
            />
          )}

          {unavailable.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <ContentCard title="Unavailable sources">
                <p style={{ ...mutedStyle, margin: "0 0 0.75rem" }}>
                  These queues could not be loaded. Counts are unknown — not zero.
                </p>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {unavailable.map(source => (
                    <div key={source.id} style={unavailableRowStyle}>
                      <span style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600 }}>
                        {source.label}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "#FCA5A5" }}>
                        Unavailable{source.error ? `: ${source.error}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </ContentCard>
            </div>
          )}

          <p style={{ ...mutedStyle, marginTop: "1rem" }}>{snapshot.disclaimer}</p>
        </>
      )}
    </RedesignPage>
  );
}

function AttentionRow({ source }: { source: OperatorAttentionSource }) {
  return (
    <Link href={source.href} style={attentionLinkStyle}>
      <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 600 }}>{source.label}</span>
      <span style={{
        fontFamily: MONO, fontSize: "0.72rem", fontWeight: 700,
        padding: "0.2rem 0.55rem", borderRadius: 999,
        background: "rgba(251,191,36,0.15)", color: "#FBBF24",
        border: "1px solid rgba(251,191,36,0.35)",
      }}>
        {source.count}
      </span>
    </Link>
  );
}

const refreshStyle: React.CSSProperties = {
  padding: "0.35rem 0.65rem", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--accent)", fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer",
};

const metaStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", alignSelf: "center",
};

const mutedStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0,
};

const attentionLinkStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "0.75rem 0.85rem", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--surface)",
  textDecoration: "none", color: "var(--text-primary)",
};

const unavailableRowStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
  padding: "0.55rem 0.7rem", borderRadius: 8,
  border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.06)",
};
