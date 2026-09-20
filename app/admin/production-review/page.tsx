"use client";
// FILE: app/admin/production-review/page.tsx
// Operator Production-review queue. Separate from partner Launchpad.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin/adminFetch";
import { PRODUCTION_REVIEW_NOTICE } from "@/lib/partner/launchpad/productionReview/contract";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

interface QueueItem {
  request_ref: string;
  request_id: string;
  app_label: string;
  policy_id: string;
  policy_version: number;
  selected_capabilities: string[];
  sandbox_readiness_class: string;
  test_console_class: string;
  webhook_health_class: string;
  policy_compatibility_class: string;
  network_contexts: Array<{ network_id: string; status: string; environment: string }>;
  submitted_note: string | null;
  submitted_at: string;
  decision_status: string;
}

export default function AdminProductionReviewPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmDecision, setConfirmDecision] = useState<"approve" | "reject" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/production-review", { cache: "no-store" });
      const data = await res.json() as { items?: QueueItem[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(requestId: string, decision: "approve" | "reject") {
    setPendingId(requestId);
    setError("");
    try {
      const res = await adminFetch(`/api/admin/production-review/${requestId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          confirm: true,
          ...(decision === "reject" ? { remediation_class: "resubmit_after_rejection" } : {}),
        }),
      });
      const data = await res.json() as { error?: string; remediation_class?: string };
      if (!res.ok) throw new Error(data.remediation_class ?? data.error ?? "Decision failed");
      setConfirmId(null);
      setConfirmDecision(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Operator · Production review
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: "0.35rem 0" }}>
          Production review control plane
        </h1>
        <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.6, maxWidth: 720 }}>
          {PRODUCTION_REVIEW_NOTICE}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", marginTop: "0.65rem" }}>
          <Link href="/docs/production-review" style={{ color: ACCENT }}>Operator guide</Link>
          {" · "}
          <Link href="/admin/partner-flow" style={{ color: ACCENT }}>Partner Flow health</Link>
        </p>

        {loading && <p style={{ fontFamily: FONT, color: "rgba(255,255,255,0.5)" }}>Loading pending requests…</p>}
        {error && <p role="alert" style={{ fontFamily: FONT, color: "#f87171" }}>{error}</p>}
        {!loading && items.length === 0 && (
          <p style={{ fontFamily: FONT, color: "rgba(255,255,255,0.5)" }}>No pending Production-review requests.</p>
        )}

        <div style={{ display: "grid", gap: "0.85rem", marginTop: "1.25rem" }}>
          {items.map((item) => (
            <article
              key={item.request_ref}
              aria-label={`Review ${item.app_label}`}
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "1rem",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <h2 style={{ fontFamily: FONT, fontSize: "1rem", margin: 0 }}>{item.app_label}</h2>
              <p style={{ fontFamily: MONO, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", margin: "0.35rem 0 0.75rem" }}>
                {item.request_ref} · {item.policy_id} v{item.policy_version} · submitted {item.submitted_at}
              </p>
              <dl style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.65rem",
                margin: 0,
                fontFamily: FONT,
                fontSize: "0.78rem",
              }}>
                <div><dt style={{ opacity: 0.55 }}>Readiness</dt><dd style={{ margin: 0 }}>{item.sandbox_readiness_class.replace(/_/g, " ")}</dd></div>
                <div><dt style={{ opacity: 0.55 }}>Test console</dt><dd style={{ margin: 0 }}>{item.test_console_class.replace(/_/g, " ")}</dd></div>
                <div><dt style={{ opacity: 0.55 }}>Webhook health</dt><dd style={{ margin: 0 }}>{item.webhook_health_class.replace(/_/g, " ")}</dd></div>
                <div><dt style={{ opacity: 0.55 }}>Policy compatibility</dt><dd style={{ margin: 0 }}>{item.policy_compatibility_class.replace(/_/g, " ")}</dd></div>
                <div><dt style={{ opacity: 0.55 }}>Capabilities</dt><dd style={{ margin: 0 }}>{item.selected_capabilities.join(", ") || "none"}</dd></div>
                <div>
                  <dt style={{ opacity: 0.55 }}>Networks</dt>
                  <dd style={{ margin: 0 }}>
                    {item.network_contexts.length
                      ? item.network_contexts.map((row) => `${row.network_id} (${row.status})`).join(", ")
                      : "none requested"}
                  </dd>
                </div>
              </dl>
              {item.submitted_note && (
                <p style={{ fontFamily: FONT, fontSize: "0.78rem", marginTop: "0.75rem" }}>Note: {item.submitted_note}</p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.9rem" }}>
                <button
                  type="button"
                  aria-label={`Approve ${item.app_label}`}
                  disabled={pendingId === item.request_id}
                  onClick={() => { setConfirmId(item.request_id); setConfirmDecision("approve"); }}
                  style={{
                    padding: "0.55rem 0.85rem",
                    borderRadius: 8,
                    border: "none",
                    background: ACCENT,
                    color: "#04110c",
                    fontWeight: 700,
                    fontFamily: FONT,
                    cursor: "pointer",
                  }}
                >
                  Approve reviewed path
                </button>
                <button
                  type="button"
                  aria-label={`Reject ${item.app_label}`}
                  disabled={pendingId === item.request_id}
                  onClick={() => { setConfirmId(item.request_id); setConfirmDecision("reject"); }}
                  style={{
                    padding: "0.55rem 0.85rem",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    color: "#fecaca",
                    fontWeight: 700,
                    fontFamily: FONT,
                    cursor: "pointer",
                  }}
                >
                  Reject
                </button>
              </div>
              {confirmId === item.request_id && confirmDecision && (
                <div role="alertdialog" aria-label="Confirm review decision" style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: 8, border: "1px solid rgba(16,185,129,0.35)" }}>
                  <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: 0 }}>
                    {confirmDecision === "approve"
                      ? "Confirm approval for the reviewed Production integration path only. No key, Mainnet, wallet, or transfer is created."
                      : "Confirm rejection. The partner sees only a safe remediation class, not internal reasons."}
                  </p>
                  <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.6rem" }}>
                    <button
                      type="button"
                      onClick={() => void decide(item.request_id, confirmDecision)}
                      style={{ padding: "0.45rem 0.75rem", borderRadius: 8, border: "none", background: ACCENT, color: "#04110c", fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}
                    >
                      Confirm {confirmDecision}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setConfirmId(null); setConfirmDecision(null); }}
                      style={{ padding: "0.45rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#f0f0f0", fontFamily: FONT, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
