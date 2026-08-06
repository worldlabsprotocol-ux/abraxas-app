"use client";
// FILE: components/passport/PassportShareHistoryCard.tsx
// Which partners accessed what claims. consent receipt history.

import { useQuery } from "@tanstack/react-query";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
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
  verifiedView = false,
}: {
  suiAddress: string | null;
  verifiedView?: boolean;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["passport", "share-history", suiAddress],
    queryFn: () => fetchShareHistory(),
    enabled: Boolean(suiAddress),
    staleTime: 30_000,
  });

  if (!suiAddress) return null;

  return (
    <div style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      borderRadius: 16,
      padding: "1.15rem 1.25rem",
      marginBottom: "1.5rem",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.65rem",
      }}>
        Partner access history
      </div>

      {isLoading && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>Loading…</p>
      )}

      {isError && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
          Share history requires migrations 018+ applied.
        </p>
      )}

      {!isLoading && !isError && (data?.shares.length ?? 0) === 0 && (
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          {verifiedView
            ? "No partner access yet. When a compatible app requests your proof, you'll review what they need and approve here."
            : "No partner consent receipts yet. When a partner requests eligibility, approvals appear here."}
        </p>
      )}

      {data?.shares.map(share => (
        <div key={share.id} style={{
          padding: "0.55rem 0.65rem", borderRadius: 10, marginBottom: "0.4rem",
          background: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {share.partner_id}
            {share.purpose ? ` · ${share.purpose.replace(/_/g, " ")}` : ""}
          </div>
          <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)", marginTop: 2 }}>
            {new Date(share.shared_at).toLocaleString()}
            {share.claims_authorized.length ? ` · ${share.claims_authorized.join(", ")}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
