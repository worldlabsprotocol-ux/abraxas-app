"use client";
// FILE: app/admin/passport-support/page.tsx
// Operator inbox for Passport holder support requests.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ProductionAdminSessionStatus,
  PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE,
  useProductionAdminSessionGate,
} from "@/lib/admin/productionAdminSessionUi";
import type { AdminPassportSupportItem } from "@/lib/admin/passportSupportQueue";

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

export default function AdminPassportSupportPage() {
  const gate = useProductionAdminSessionGate();
  const [requests, setRequests] = useState<AdminPassportSupportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const canLoad = gate.usePinUnlock ? Boolean(gate.pin) : gate.authorized;

  const loadRequests = useCallback(async () => {
    if (gate.loading || !canLoad) return;
    setLoading(true);
    setError("");
    try {
      const res = await gate.adminRequest("/api/admin/passport-support", { cache: "no-store" });
      const data = await res.json() as { requests?: AdminPassportSupportItem[]; error?: string };
      if (res.status === 401 && !gate.usePinUnlock) {
        throw new Error(PRODUCTION_ADMIN_UNAUTHORIZED_MESSAGE);
      }
      if (!res.ok) throw new Error(data.error ?? "Could not load the support inbox.");
      setRequests(data.requests ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the support inbox.");
    } finally {
      setLoading(false);
    }
  }, [canLoad, gate.adminRequest, gate.loading, gate.usePinUnlock]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter(request =>
      request.reference.toLowerCase().includes(query) ||
      request.email.toLowerCase().includes(query) ||
      request.issue_label.toLowerCase().includes(query) ||
      request.message.toLowerCase().includes(query)
    );
  }, [requests, search]);

  return (
    <div style={{ minHeight: "100vh", background: "#060810", color: "#f0f0f0", fontFamily: FONT }}>
      <header style={{
        padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
      }}>
        <div>
          <Link href="/admin/partners" style={{ color: "#a78bfa", fontFamily: MONO, fontSize: "0.72rem", textDecoration: "none" }}>
            ← Admin
          </Link>
          <h1 style={{ fontSize: "1rem", margin: "0.35rem 0 0", letterSpacing: "-0.01em" }}>Passport Support</h1>
          <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.48)", margin: "0.3rem 0 0" }}>
            Holder requests connected to signed-in Passport accounts.
          </p>
        </div>
        {gate.usePinUnlock ? (
          <input
            type="password"
            value={gate.pin}
            onChange={event => gate.setPin(event.target.value)}
            placeholder="Admin PIN"
            aria-label="Admin PIN"
            style={{
              alignSelf: "center", padding: "0.5rem 0.65rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6, color: "#f0f0f0", fontFamily: MONO, fontSize: "0.7rem",
            }}
          />
        ) : (
          <ProductionAdminSessionStatus
            gate={gate}
            style={{
              alignSelf: "center", fontSize: "0.68rem",
              color: gate.authorized ? "#86EFAC" : "#f26b6b", margin: 0,
            }}
          />
        )}
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "1.25rem 1.5rem 3rem" }}>
        {!gate.usePinUnlock && !gate.loading && !gate.authorized && (
          <div role="alert" style={{
            padding: "0.7rem 0.8rem", marginBottom: "1rem",
            background: "rgba(242,107,107,0.1)", border: "1px solid rgba(242,107,107,0.25)",
            borderRadius: 7, fontSize: "0.72rem", color: "#f26b6b",
          }}>
            {gate.unauthorizedMessage}
          </div>
        )}

        <section style={{
          padding: "1rem", border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 10, background: "rgba(255,255,255,0.02)", marginBottom: "1rem",
        }}>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: ACCENT, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Support inbox
              </div>
              <div style={{ fontSize: "0.75rem", marginTop: "0.35rem", color: "rgba(255,255,255,0.58)" }}>
                {loading ? "Loading…" : `${visibleRequests.length} of ${requests.length} requests`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadRequests()}
              disabled={loading || !canLoad}
              style={{
                padding: "0.45rem 0.7rem", borderRadius: 6,
                border: "1px solid rgba(16,185,129,0.35)",
                background: "rgba(16,185,129,0.08)", color: "#86EFAC",
                fontFamily: MONO, fontSize: "0.65rem",
                cursor: loading || !canLoad ? "not-allowed" : "pointer",
                opacity: loading || !canLoad ? 0.55 : 1,
              }}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <label htmlFor="support-search" style={{
            display: "block", fontSize: "0.68rem", color: "rgba(255,255,255,0.55)",
            marginTop: "0.85rem",
          }}>
            Search requests
          </label>
          <input
            id="support-search"
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Reference, email, issue, or message"
            style={{
              width: "100%", boxSizing: "border-box", marginTop: "0.35rem",
              padding: "0.6rem 0.7rem", borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.22)", color: "#f0f0f0",
              fontFamily: FONT, fontSize: "0.75rem",
            }}
          />
        </section>

        {error && (
          <div role="alert" style={{
            padding: "0.7rem 0.8rem", marginBottom: "1rem",
            background: "rgba(242,107,107,0.1)", border: "1px solid rgba(242,107,107,0.25)",
            borderRadius: 7, fontSize: "0.72rem", color: "#f26b6b",
          }}>
            {error}
          </div>
        )}

        {!loading && !error && visibleRequests.length === 0 ? (
          <section style={{
            padding: "1.5rem", border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: 10, color: "rgba(255,255,255,0.52)", fontSize: "0.75rem",
          }}>
            {requests.length === 0
              ? "No Passport support requests yet."
              : "No requests match this search."}
          </section>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {visibleRequests.map(request => (
              <article key={request.reference} style={{
                padding: "1rem", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 10, background: "rgba(255,255,255,0.025)",
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", gap: "1rem", flexWrap: "wrap",
                }}>
                  <div>
                    <code style={{ fontFamily: MONO, fontSize: "0.72rem", color: "#c4b5fd" }}>
                      {request.reference}
                    </code>
                    <h2 style={{ fontSize: "0.86rem", margin: "0.35rem 0 0" }}>{request.issue_label}</h2>
                  </div>
                  <span style={{
                    fontFamily: MONO, fontSize: "0.6rem", fontWeight: 700,
                    color: ACCENT, border: "1px solid rgba(16,185,129,0.3)",
                    background: "rgba(16,185,129,0.08)", borderRadius: 999,
                    padding: "0.2rem 0.5rem", textTransform: "uppercase",
                  }}>
                    {request.status}
                  </span>
                </div>
                <dl style={{
                  display: "grid", gridTemplateColumns: "90px 1fr",
                  gap: "0.4rem 0.6rem", margin: "0.85rem 0 0", fontSize: "0.7rem",
                }}>
                  <dt style={{ color: "rgba(255,255,255,0.4)" }}>Account</dt>
                  <dd style={{ margin: 0, wordBreak: "break-word" }}>{request.email}</dd>
                  <dt style={{ color: "rgba(255,255,255,0.4)" }}>Submitted</dt>
                  <dd style={{ margin: 0 }}>{new Date(request.submitted_at).toLocaleString()}</dd>
                  <dt style={{ color: "rgba(255,255,255,0.4)" }}>Message</dt>
                  <dd style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.55, color: "rgba(255,255,255,0.78)" }}>
                    {request.message}
                  </dd>
                </dl>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
