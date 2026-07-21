"use client";
// FILE: app/admin/inquiries/page.tsx
// Asset acquisition inquiry operator queue.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const PIN_KEY = "abraxas_admin_pin";

interface Inquiry {
  id: string;
  asset_id: string;
  asset_name: string;
  package_interest: string | null;
  email: string;
  wallet: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const STATUSES = ["submitted", "routed", "in_diligence", "closed"] as const;

export default function AdminInquiriesPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PIN_KEY);
      if (saved) {
        setPin(saved);
        setAuthed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/asset-inquiries", { headers: { "x-admin-pin": pin } });
    if (!res.ok) return;
    const data = await res.json();
    setInquiries(data.inquiries ?? []);
  }, [pin]);

  useEffect(() => {
    if (!authed || !pin) return;
    void refresh();
  }, [authed, pin, refresh]);

  async function login() {
    sessionStorage.setItem(PIN_KEY, pin);
    setAuthed(true);
  }

  async function updateStatus(id: string, status: string) {
    setMsg("");
    const res = await fetch("/api/admin/asset-inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setMsg("Status update failed");
      return;
    }
    await refresh();
  }

  if (!authed) {
    return (
      <RedesignPage maxWidth={420}>
        <PageHeader eyebrow="Admin" title="Asset inquiries" subtitle="Operator PIN required." />
        <ContentCard title="Sign in">
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Admin PIN"
            style={inputStyle}
          />
          <button type="button" onClick={login} style={btnStyle}>Enter →</button>
        </ContentCard>
      </RedesignPage>
    );
  }

  return (
    <RedesignPage maxWidth={960}>
      <PageHeader
        eyebrow="Admin · acquisition"
        title="Asset inquiry queue"
        subtitle="Closed-loop buyer interest from case studies — route to partner, update status on-protocol."
      />

      {msg && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#F87171", marginBottom: "0.75rem" }}>{msg}</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
        <Link href="/admin/design-partners" style={linkStyle}>Design partners →</Link>
        <Link href="/admin/listings" style={linkStyle}>Lot inventory →</Link>
        <Link href="/api/positioning/loop" style={linkStyle} target="_blank">Positioning loop API →</Link>
      </div>

      <ContentCard title={`Inquiries (${inquiries.length})`}>
        {inquiries.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
            No inquiries yet — Chickasaw inquire panel POSTs to /api/assets/inquire with on-chain proof.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {inquiries.map(row => (
              <div
                key={row.id}
                style={{
                  padding: "0.85rem", borderRadius: 12,
                  border: "1px solid var(--border)", background: "var(--surface)",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {row.asset_name}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
                    {row.asset_id}
                  </span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  <div><strong>Package:</strong> {row.package_interest ?? "—"}</div>
                  <div><strong>Email:</strong> {row.email}</div>
                  {row.wallet && <div><strong>Wallet:</strong> {row.wallet}</div>}
                  {row.message && <div><strong>Message:</strong> {row.message}</div>}
                  <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                    {new Date(row.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.65rem" }}>
                  {STATUSES.map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void updateStatus(row.id, status)}
                      style={{
                        padding: "0.3rem 0.55rem", borderRadius: 999, cursor: "pointer",
                        border: row.status === status ? "1px solid var(--accent)" : "1px solid var(--border)",
                        background: row.status === status ? "rgba(232,197,71,0.12)" : "transparent",
                        color: row.status === status ? "var(--accent)" : "var(--text-muted)",
                        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentCard>
    </RedesignPage>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.65rem 0.85rem", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text-primary)", fontFamily: FONT, fontSize: "16px",
  boxSizing: "border-box", marginBottom: "0.55rem",
};

const btnStyle: React.CSSProperties = {
  padding: "0.55rem 1rem", borderRadius: 999, border: "none",
  background: "var(--accent)", color: "#1a1400",
  fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
  color: "var(--accent)", textDecoration: "none",
};
