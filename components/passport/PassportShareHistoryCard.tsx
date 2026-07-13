"use client";
// FILE: components/passport/PassportShareHistoryCard.tsx
// Access & sharing — proofs shared with partners, not documents.

import { useQuery } from "@tanstack/react-query";
import { formatSharedProof } from "@/lib/passport/passportCanonicalState";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

interface ShareRecord {
  id: string;
  partner_id: string;
  purpose: string | null;
  claims_authorized: string[];
  shared_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

async function fetchShareHistory() {
  const res = await fetch("/api/credentials/share-history", { credentials: "include" });
  if (!res.ok) throw new Error("Share history unavailable");
  return res.json() as Promise<{ shares: ShareRecord[] }>;
}

export function PassportShareHistoryCard({
  suiAddress,
  showTimeline = false,
}: {
  suiAddress: string | null;
  showTimeline?: boolean;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["passport", "share-history", suiAddress],
    queryFn: () => fetchShareHistory(),
    enabled: Boolean(suiAddress),
    staleTime: 30_000,
  });

  if (!suiAddress) return null;

  const shares = data?.shares ?? [];

  return (
    <div style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      borderRadius: 16,
      padding: "1.15rem 1.25rem",
      marginBottom: "1.25rem",
    }}>
      <h3 style={{
        fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.35rem",
      }}>
        {showTimeline ? "Activity" : "Partner access"}
      </h3>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
        lineHeight: 1.55, margin: "0 0 0.85rem",
      }}>
        {showTimeline
          ? "What you verified, connected, shared, and revoked."
          : "Proofs you shared — not document files."}
      </p>

      {isLoading && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>Loading…</p>
      )}

      {isError && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
          Access history unavailable in this environment.
        </p>
      )}

      {!isLoading && !isError && shares.length === 0 && (
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Nothing shared yet. When you approve a partner request, it appears here.
        </p>
      )}

      {shares.map(share => {
        const proof = formatSharedProof(share.claims_authorized, share.purpose);
        const revoked = Boolean(share.revoked_at);
        return (
          <div key={share.id} style={{
            padding: "0.65rem 0.75rem", borderRadius: 10, marginBottom: "0.45rem",
            background: "var(--surface-inset)", border: "1px solid var(--border)",
            opacity: revoked ? 0.65 : 1,
          }}>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {share.partner_id}
              {revoked ? " · Revoked" : " · Active"}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, marginTop: 2 }}>
              Shared: {proof}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 4 }}>
              {new Date(share.shared_at).toLocaleString()}
              {share.expires_at ? ` · Expires ${new Date(share.expires_at).toLocaleDateString()}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
