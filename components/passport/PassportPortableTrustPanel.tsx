"use client";
// FILE: components/passport/PassportPortableTrustPanel.tsx
// Build #565 — holder portable credentials (export / disclosure).

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { HolderPortableCredentialSummary } from "@/lib/passport/portableTrust/contract";
import { SELECTIVE_DISCLOSURE_HONESTY } from "@/lib/passport/portableTrust/privacyDisclosure";

const FONT = ABRAXAS_FONT_SANS;

export function PassportPortableTrustPanel({ suiAddress }: { suiAddress: string | null }) {
  const [credentials, setCredentials] = useState<HolderPortableCredentialSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!suiAddress) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/passport/portable-trust/credentials?sui=${encodeURIComponent(suiAddress)}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { credentials?: HolderPortableCredentialSummary[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "load_failed");
      setCredentials(data.credentials ?? []);
    } catch {
      setError("Portable credentials are unavailable right now.");
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [suiAddress]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCredential(receiptId: string) {
    setExportBusy(receiptId);
    try {
      const res = await fetch("/api/passport/portable-trust/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_id: receiptId }),
      });
      const data = (await res.json()) as { bundle?: unknown; error?: string };
      if (!res.ok || !data.bundle) throw new Error(data.error ?? "export_failed");
      const blob = new Blob([JSON.stringify(data.bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `abraxas-presentation-${receiptId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Confirm you are signed in and this receipt is still active.");
    } finally {
      setExportBusy(null);
    }
  }

  if (!suiAddress) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
        Sign in to manage portable authorization receipts.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>
        {SELECTIVE_DISCLOSURE_HONESTY}
      </p>
      {loading && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>Loading…</p>
      )}
      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#EF4444", margin: 0 }}>{error}</p>
      )}
      {!loading && credentials.length === 0 && !error && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
          Approved partner authorizations appear here after you complete a verification request.
        </p>
      )}
      {credentials.map((row) => (
        <article
          key={row.receipt_id}
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "0.85rem",
            background: "var(--surface-raised)",
          }}
        >
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 0.35rem" }}>
            {row.partner_id} · {row.policy_id}
          </p>
          <p style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, margin: "0 0 0.35rem" }}>
            {row.status === "active" ? "Active authorization" : `Status: ${row.status}`}
          </p>
          <ul style={{ margin: "0 0 0.65rem", paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)" }}>
            {row.assurance_labels.slice(0, 4).map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.65rem" }}>
            Audience-bound to {row.partner_id}. Expires {row.expires_at ?? "when revoked or policy changes"}.
          </p>
          <Btn
            size="sm"
            variant="secondary"
            loading={exportBusy === row.receipt_id}
            onClick={() => void exportCredential(row.receipt_id)}
          >
            Export portable presentation
          </Btn>
        </article>
      ))}
    </div>
  );
}
