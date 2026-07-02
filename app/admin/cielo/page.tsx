"use client";
// FILE: app/admin/cielo/page.tsx
// Operator console: Protocol Calendar blocks + booking status (no Airbnb host access needed).

import { useState, useEffect } from "react";
import Link from "next/link";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";
const PIN_KEY = "abraxas_admin_pin";

interface Block {
  id: string;
  start_date: string;
  end_date: string;
  source: string;
  booking_id: string | null;
  note: string | null;
}

interface Booking {
  booking_id: string;
  guest_name: string;
  email: string;
  check_in: string;
  check_out: string;
  status: string;
  est_usdc: number;
  payment_tx_digest?: string | null;
}

export default function CieloAdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("Blocked after checking public Airbnb listing");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PIN_KEY);
      if (saved) { setPin(saved); setAuthed(true); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!authed || !pin) return;
    refresh();
  }, [authed, pin]);

  async function refresh() {
    const headers = { "x-admin-pin": pin };
    const [b, k] = await Promise.all([
      fetch("/api/admin/cielo/calendar", { headers }).then(r => r.json()),
      fetch("/api/admin/cielo/bookings", { headers }).then(r => r.json()),
    ]);
    setBlocks(b.blocks ?? []);
    setBookings(k.bookings ?? []);
  }

  async function login() {
    sessionStorage.setItem(PIN_KEY, pin);
    setAuthed(true);
  }

  async function addBlock() {
    setMsg("");
    const res = await fetch("/api/admin/cielo/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({ start_date: start, end_date: end, note, pin }),
    });
    if (!res.ok) { setMsg("Could not add block"); return; }
    setStart(""); setEnd("");
    await refresh();
    setMsg("Block added to Protocol Calendar");
  }

  async function removeBlock(id: string) {
    await fetch("/api/admin/cielo/calendar", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({ id, pin }),
    });
    await refresh();
  }

  async function updateBooking(id: string, status: string) {
    await fetch("/api/admin/cielo/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({ booking_id: id, status, pin }),
    });
    await refresh();
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg,#06090B)", color: "#fff", padding: "2rem" }}>
        <h1 style={{ fontFamily: FONT, fontSize: "1.25rem" }}>Cielo Protocol Calendar</h1>
        <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "#888" }}>Operator PIN required</p>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)}
          style={{ padding: "0.5rem", marginTop: "1rem", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#fff" }} />
        <button type="button" onClick={login} style={{ marginLeft: "0.5rem", padding: "0.5rem 1rem", borderRadius: 8, background: ACCENT, border: "none", fontWeight: 700 }}>
          Enter
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg,#06090B)", color: "#fff", padding: "clamp(1rem,3vw,2rem)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link href="/flagship" style={{ fontFamily: FONT, fontSize: "0.8rem", color: "#888" }}>← Cielo Sunrise</Link>
        <h1 style={{ fontFamily: FONT, fontSize: "1.5rem", fontWeight: 800, margin: "0.75rem 0 0.25rem" }}>
          Abraxas Protocol Calendar
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "#888", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Block dates you see taken on the public Airbnb listing. Abraxas crypto bookings use this calendar as source of truth.
        </p>

        {msg && <p style={{ color: ACCENT, fontFamily: FONT, fontSize: "0.8rem" }}>{msg}</p>}

        <section style={{ marginBottom: "2rem", padding: "1rem", borderRadius: 12, border: "1px solid #222", background: "#0D1117" }}>
          <h2 style={{ fontFamily: FONT, fontSize: "1rem", marginBottom: "0.75rem" }}>Add operator block</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} style={inp} />
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={inp} />
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note" style={{ ...inp, marginBottom: "0.5rem" }} />
          <button type="button" onClick={addBlock} style={btn}>Block dates</button>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontFamily: FONT, fontSize: "1rem", marginBottom: "0.75rem" }}>Calendar blocks ({blocks.length})</h2>
          {blocks.map(b => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", padding: "0.5rem 0", borderBottom: "1px solid #222", fontFamily: MONO, fontSize: "0.72rem" }}>
              <span>{b.start_date} → {b.end_date} · {b.source} {b.booking_id ? `· ${b.booking_id}` : ""}</span>
              {b.source === "operator" && (
                <button type="button" onClick={() => removeBlock(b.id)} style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer" }}>Remove</button>
              )}
            </div>
          ))}
        </section>

        <section>
          <h2 style={{ fontFamily: FONT, fontSize: "1rem", marginBottom: "0.75rem" }}>Bookings</h2>
          {bookings.map(b => (
            <div key={b.booking_id} style={{ padding: "0.75rem 0", borderBottom: "1px solid #222" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 600 }}>{b.guest_name} · {b.booking_id}</div>
              <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "#888" }}>
                {b.check_in} → {b.check_out} · ~{b.est_usdc} USDC · {b.status}
                {b.payment_tx_digest && ` · tx ${b.payment_tx_digest.slice(0, 10)}…`}
              </div>
              <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                {["confirmed", "authorized", "captured", "cancelled"].map(s => (
                  <button key={s} type="button" onClick={() => updateBooking(b.booking_id, s)}
                    style={{ ...btn, padding: "0.25rem 0.5rem", fontSize: "0.65rem" }}>{s}</button>
                ))}
                <a href={`/cielo/pay?booking_id=${encodeURIComponent(b.booking_id)}`}
                  style={{ ...btn, padding: "0.25rem 0.5rem", fontSize: "0.65rem", textDecoration: "none", display: "inline-block" }}>
                  Pay page
                </a>
                <a href={`/cielo/status?booking_id=${encodeURIComponent(b.booking_id)}`}
                  style={{ ...btn, padding: "0.25rem 0.5rem", fontSize: "0.65rem", textDecoration: "none", display: "inline-block", background: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}>
                  Status
                </a>
                {b.status === "captured" && (
                  <a href={`/cielo/receipt?booking_id=${encodeURIComponent(b.booking_id)}`}
                    style={{ ...btn, padding: "0.25rem 0.5rem", fontSize: "0.65rem", textDecoration: "none", display: "inline-block", background: "transparent", color: ACCENT, border: `1px solid ${ACCENT}` }}>
                    Receipt
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", padding: "0.45rem", borderRadius: 8, border: "1px solid #333", background: "#111", color: "#fff", boxSizing: "border-box",
};

const btn: React.CSSProperties = {
  padding: "0.45rem 0.85rem", borderRadius: 8, border: "none", background: ACCENT, color: "#000", fontWeight: 700, cursor: "pointer",
};
