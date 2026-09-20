"use client";
// FILE: app/admin/policy-proposals/page.tsx

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin/adminFetch";
import { POLICY_PROPOSAL_NOTICE, POLICY_PROPOSAL_OPERATOR_STATUSES, POLICY_PROPOSAL_STATE_LABELS } from "@/lib/partner/policyProposal/contract";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

interface Item {
  id: string;
  proposal_ref: string;
  partner_ref: string;
  status: keyof typeof POLICY_PROPOSAL_STATE_LABELS;
  status_label: string;
  remediation: string | null;
  planning: { proposed_pack_shape?: string; live_policy?: boolean } | null;
}

export default function AdminPolicyProposalsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    const res = await adminFetch("/api/admin/policy-proposals", { cache: "no-store" });
    const data = await res.json() as { items?: Item[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Unavailable");
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Unavailable"));
  }, [load]);

  async function decide(id: string, status: string) {
    setPending(id);
    setError("");
    try {
      const res = await adminFetch(`/api/admin/policy-proposals/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, confirm: true, remediation: status === "needs_information" ? "Need a clearer product action" : null }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Decision failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800 }}>Policy proposals</h1>
        <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}>{POLICY_PROPOSAL_NOTICE}</p>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem" }}>
          <Link href="/docs/policy-proposals" style={{ color: ACCENT }}>Proposal docs</Link>
          {" · "}
          <Link href="/admin/production-review" style={{ color: ACCENT }}>Production review</Link>
        </p>
        {error && <p role="alert" style={{ fontFamily: FONT, color: "#f87171" }}>{error}</p>}
        <div style={{ display: "grid", gap: "0.85rem", marginTop: "1rem" }}>
          {items.map((item) => (
            <article key={item.proposal_ref} aria-label={`Proposal ${item.proposal_ref}`} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "1rem" }}>
              <h2 style={{ fontFamily: FONT, fontSize: "1rem", margin: 0 }}>{item.proposal_ref}</h2>
              <p style={{ fontFamily: FONT, fontSize: "0.75rem", opacity: 0.7 }}>{item.partner_ref} · {item.status_label}</p>
              {item.planning && (
                <p style={{ fontFamily: FONT, fontSize: "0.78rem" }}>
                  Planning shape {item.planning.proposed_pack_shape}. Live policy: no.
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.6rem" }}>
                {POLICY_PROPOSAL_OPERATOR_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={pending === item.id}
                    onClick={() => void decide(item.id, status)}
                    style={{ padding: "0.45rem 0.7rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#f0f0f0", fontFamily: FONT, cursor: "pointer" }}
                  >
                    {POLICY_PROPOSAL_STATE_LABELS[status]}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
