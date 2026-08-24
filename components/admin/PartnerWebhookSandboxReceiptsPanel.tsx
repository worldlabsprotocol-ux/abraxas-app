"use client";
// FILE: components/admin/PartnerWebhookSandboxReceiptsPanel.tsx
// Read-only Production-session sandbox webhook test receipt metadata.

import { useState } from "react";
import {
  ProductionAdminSessionStatus,
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE,
  useProductionAdminSessionGate,
} from "@/lib/admin/productionAdminSessionUi";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

interface SandboxReceiptRow {
  event_id: string;
  partner_id: string;
  event_type: string;
  received_at: string;
}

export function PartnerWebhookSandboxReceiptsPanel() {
  const gate = useProductionAdminSessionGate();
  const [partnerInput, setPartnerInput] = useState("");
  const [receipts, setReceipts] = useState<SandboxReceiptRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadReceipts() {
    const partnerId = partnerInput.trim();
    if (!partnerId) return;

    setLoading(true);
    setError("");
    setReceipts([]);

    try {
      const res = await gate.adminRequest(
        `/api/admin/partners/webhooks/sandbox-receipts?partner_id=${encodeURIComponent(partnerId)}`,
        { cache: "no-store" },
      );

      if (res.status === 401 && !gate.usePinUnlock) {
        setError(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
        return;
      }

      const body = await res.json() as { receipts?: SandboxReceiptRow[]; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Receipts unavailable");
        return;
      }

      setReceipts(body.receipts ?? []);
    } catch {
      setError("Receipts unavailable");
    } finally {
      setLoading(false);
    }
  }

  if (gate.loading) {
    return <p style={mutedStyle}>Checking admin session…</p>;
  }

  if (!gate.authorized && !gate.usePinUnlock) {
    return <p style={mutedStyle}>{PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE}</p>;
  }

  if (!gate.authorized) {
    return (
      <p style={mutedStyle}>
        Sign in via the admin layout gate to view sandbox test receipts.
      </p>
    );
  }

  return (
    <div>
      <ProductionAdminSessionStatus gate={gate} />

      <p style={{ ...mutedStyle, margin: "0.75rem 0" }}>
        Read-only verified sandbox test receipts. Select a partner and click Load. No endpoint URLs, secrets, or payloads are shown.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        <input
          type="text"
          value={partnerInput}
          onChange={(e) => setPartnerInput(e.target.value)}
          placeholder="partner_id"
          data-testid="sandbox-receipts-partner-input"
          style={inputStyle}
        />
        <button
          type="button"
          data-testid="sandbox-receipts-load-button"
          onClick={() => void loadReceipts()}
          disabled={!partnerInput.trim() || loading || !gate.authorized}
          style={buttonStyle}
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {error && <p style={{ color: "#f87171", fontFamily: FONT, fontSize: "0.76rem" }}>{error}</p>}

      {receipts.length === 0 && !loading && !error ? (
        <p style={mutedStyle}>No verified sandbox test receipts loaded.</p>
      ) : (
        <div data-testid="sandbox-receipts-table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.74rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                <th style={thStyle}>Received</th>
                <th style={thStyle}>Event ID</th>
                <th style={thStyle}>Type</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((row) => (
                <tr key={row.event_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <td style={tdStyle}>{new Date(row.received_at).toLocaleString()}</td>
                  <td style={tdStyle}>{row.event_id}</td>
                  <td style={tdStyle}>Sandbox test</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const mutedStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.76rem",
  color: "rgba(255,255,255,0.65)",
  lineHeight: 1.55,
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  flex: "1 1 220px",
  padding: "0.55rem 0.75rem",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#f0f0f0",
  fontFamily: MONO,
  fontSize: "0.72rem",
};

const buttonStyle: React.CSSProperties = {
  padding: "0.55rem 0.9rem",
  borderRadius: 8,
  border: "none",
  background: ACCENT,
  color: "#04130e",
  fontFamily: FONT,
  fontSize: "0.76rem",
  fontWeight: 700,
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.35rem",
  color: "rgba(255,255,255,0.55)",
};

const tdStyle: React.CSSProperties = {
  padding: "0.35rem",
  verticalAlign: "top",
};
