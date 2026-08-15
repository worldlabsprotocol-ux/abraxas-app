"use client";
// FILE: app/admin/layout.tsx
// Admin shell — requires authorized email or valid admin session cookie.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";

const FONT = "'Inter',system-ui,sans-serif";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "denied" | "ok">("loading");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  async function checkAccess() {
    const res = await fetch("/api/admin/access");
    const data = await res.json() as { authorized?: boolean };
    setState(data.authorized ? "ok" : "denied");
  }

  useEffect(() => {
    void checkAccess();
  }, []);

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      setPinError("Invalid PIN");
      return;
    }
    await checkAccess();
  }

  if (state === "loading") {
    return (
      <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.5)", fontFamily: FONT }}>
        Checking admin access…
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "2rem", background: "#0a0c10", color: "#f0f0f0" }}>
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          <h1 style={{ fontFamily: FONT, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Admin access required</h1>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
            Sign in with an authorized admin Google account, or enter the reviewer PIN.
          </p>
          <form onSubmit={e => void submitPin(e)} style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Admin PIN"
              style={{
                padding: "0.6rem 0.75rem", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
                color: "#f0f0f0", fontFamily: FONT,
              }}
            />
            {pinError && (
              <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#FCA5A5", margin: 0 }}>{pinError}</p>
            )}
            <button
              type="submit"
              style={{
                padding: "0.6rem 1rem", borderRadius: 8, border: "none",
                background: "#10B981", color: "#000", fontFamily: FONT, fontWeight: 700, cursor: "pointer",
              }}
            >
              Continue
            </button>
          </form>
          <Link href="/" style={{ display: "inline-block", marginTop: "1rem", fontFamily: FONT, fontSize: "0.78rem", color: "#10B981" }}>
            ← Back to site
          </Link>
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
