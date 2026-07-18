"use client";
// FILE: app/admin/listings/page.tsx
// MLS lot inventory operator console.

import { useEffect, useState } from "react";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "var(--accent)";
const PIN_KEY = "abraxas_admin_pin";
const ASSET_ID = "ABX-RE-LAND-006";

interface LotRow {
  lot: number;
  acres: number;
  priceUsd: number;
  status: string;
  notes?: string;
  source: string;
  updatedAt: string;
}

interface LotEvent {
  lot_number: number;
  from_status: string | null;
  to_status: string;
  source: string;
  created_at: string;
}

export default function AdminListingsPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [events, setEvents] = useState<LotEvent[]>([]);
  const [msg, setMsg] = useState("");
  const [editingLot, setEditingLot] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState("available");
  const [editNotes, setEditNotes] = useState("");

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

  useEffect(() => {
    if (!authed || !pin) return;
    void refresh();
  }, [authed, pin]);

  async function refresh() {
    const res = await fetch(`/api/admin/listings/lots?asset_id=${ASSET_ID}`, {
      headers: { "x-admin-pin": pin },
    });
    if (!res.ok) return;
    const data = await res.json();
    setLots(data.inventory?.lots ?? []);
    setEvents(data.events ?? []);
  }

  async function login() {
    sessionStorage.setItem(PIN_KEY, pin);
    setAuthed(true);
  }

  async function saveLot(lot: number) {
    setMsg("");
    const res = await fetch("/api/admin/listings/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({
        asset_id: ASSET_ID,
        lots: [{ lot, status: editStatus, notes: editNotes || undefined }],
      }),
    });
    if (!res.ok) {
      setMsg("Update failed");
      return;
    }
    setEditingLot(null);
    setMsg("Lot updated");
    await refresh();
  }

  if (!authed) {
    return (
      <RedesignPage maxWidth={720}>
        <PageHeader eyebrow="Admin" title="MLS lot inventory" subtitle="Operator console for Chickasaw Project lot status." />
        <ContentCard title="Admin PIN required">
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Admin PIN"
              style={inputStyle}
            />
            <button type="button" onClick={() => void login()} style={btnStyle}>
              Unlock
            </button>
          </div>
        </ContentCard>
      </RedesignPage>
    );
  }

  return (
    <RedesignPage maxWidth={960}>
      <PageHeader
        eyebrow="Admin · MLS"
        title="Lot inventory"
        subtitle={`${ASSET_ID} · Chickasaw Project · partner push + manual override`}
      />

      {msg && (
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, marginBottom: "0.75rem" }}>{msg}</p>
      )}

      <ContentCard title="Current lots">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Lot", "Acres", "Price", "Status", "Source", "Updated", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lots.map(row => (
                <tr key={row.lot} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.5rem", fontWeight: 700 }}>{row.lot}</td>
                  <td style={{ padding: "0.5rem" }}>{row.acres}</td>
                  <td style={{ padding: "0.5rem" }}>{row.priceUsd > 0 ? `$${row.priceUsd.toLocaleString()}` : "—"}</td>
                  <td style={{ padding: "0.5rem" }}>{row.status}</td>
                  <td style={{ padding: "0.5rem", fontFamily: MONO, fontSize: "0.58rem" }}>{row.source}</td>
                  <td style={{ padding: "0.5rem", fontFamily: MONO, fontSize: "0.58rem" }}>
                    {new Date(row.updatedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLot(row.lot);
                        setEditStatus(row.status);
                        setEditNotes(row.notes ?? "");
                      }}
                      style={{ ...btnStyle, padding: "0.35rem 0.65rem", fontSize: "0.65rem" }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ContentCard>

      {editingLot !== null && (
        <ContentCard title={`Edit lot ${editingLot}`}>
          <div style={{ display: "grid", gap: "0.65rem", maxWidth: 420 }}>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={inputStyle}>
              <option value="available">available</option>
              <option value="under_contract">under_contract</option>
              <option value="contingent">contingent</option>
              <option value="sold">sold</option>
            </select>
            <input
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Notes"
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => void saveLot(editingLot)} style={btnStyle}>
                Save
              </button>
              <button type="button" onClick={() => setEditingLot(null)} style={{ ...btnStyle, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Cancel
              </button>
            </div>
          </div>
        </ContentCard>
      )}

      <ContentCard title="Recent status events">
        {events.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
            No events yet — partner push or manual edits will appear here.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.45rem" }}>
            {events.map(ev => (
              <div key={`${ev.lot_number}-${ev.created_at}`} style={{
                padding: "0.55rem 0.7rem",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontFamily: MONO,
                fontSize: "0.6rem",
                color: "var(--text-secondary)",
              }}>
                Lot {ev.lot_number}: {ev.from_status ?? "—"} → {ev.to_status} · {ev.source} · {new Date(ev.created_at).toLocaleString()}
              </div>
            ))}
          </div>
        )}
      </ContentCard>

      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>
        Partner API: <code>POST /api/v1/listings/lot-status</code> · Public read:{" "}
        <Link href={`/api/v1/assets/${ASSET_ID}/lots`} style={{ color: ACCENT }}>/api/v1/assets/{ASSET_ID}/lots</Link>
      </p>
    </RedesignPage>
  );
}

const inputStyle: React.CSSProperties = {
  flex: "1 1 200px",
  padding: "0.6rem 0.75rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
  fontFamily: FONT,
  fontSize: "0.82rem",
};

const btnStyle: React.CSSProperties = {
  padding: "0.6rem 1.1rem",
  borderRadius: 10,
  border: "none",
  background: ACCENT,
  color: "#1a1408",
  fontFamily: FONT,
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer",
};
