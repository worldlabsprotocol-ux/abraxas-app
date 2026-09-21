"use client";
// FILE: components/admin/PolicyReleaseCandidateBoard.tsx

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";
import {
  POLICY_RC_NOTICE,
  POLICY_RC_OPERATOR_STATUSES,
  POLICY_RC_STATE_LABELS,
} from "@/lib/partner/policyReleaseCandidate/contract";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

interface Candidate {
  id: string;
  candidate_ref: string;
  proposal_ref: string;
  partner_ref: string;
  status: keyof typeof POLICY_RC_STATE_LABELS;
  status_label: string;
  spec: { copyable: string; checklist: string[] };
  fixtures: { id: string; invariant: string }[];
  issuer_plan?: { holder_notice: string; no_verified_method: boolean; entries: { label: string; status: string }[] };
}

export function PolicyReleaseCandidateBoard({
  proposalId,
  proposalRef,
  canCreate,
  createBody,
}: {
  proposalId?: string;
  proposalRef?: string;
  canCreate?: boolean;
  createBody?: Record<string, unknown>;
}) {
  const [items, setItems] = useState<Candidate[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch("/api/admin/policy-release-candidates", { cache: "no-store" });
    const data = await res.json() as { items?: Candidate[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Unavailable");
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Unavailable"));
  }, [load]);

  async function create() {
    if (!proposalId) return;
    setPending("create");
    setError("");
    try {
      const res = await adminFetch(`/api/admin/policy-proposals/${proposalId}/release-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, ...createBody }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setPending(null);
    }
  }

  async function decide(id: string, status: string) {
    setPending(id);
    setError("");
    try {
      const res = await adminFetch(`/api/admin/policy-release-candidates/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          confirm: true,
          remediation: status === "needs_revision" ? "Need a narrower action or result" : null,
        }),
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

  const visible = proposalRef ? items.filter((item) => item.proposal_ref === proposalRef) : items;

  return (
    <section aria-labelledby={proposalId ? `policy-rc-heading-${proposalId}` : "policy-rc-heading"} style={{ marginTop: "0.85rem" }}>
      <h2
        id={proposalId ? `policy-rc-heading-${proposalId}` : "policy-rc-heading"}
        style={{ fontFamily: FONT, fontSize: "0.95rem", margin: "0 0 0.35rem" }}
      >
        Release candidates
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.55, margin: 0 }}>
        {POLICY_RC_NOTICE}
      </p>
      {canCreate && (
        <button
          type="button"
          disabled={pending === "create"}
          onClick={() => void create()}
          style={{ marginTop: "0.55rem", padding: "0.45rem 0.75rem", borderRadius: 8, border: `1px solid ${ACCENT}`, background: "transparent", color: ACCENT, fontFamily: FONT, cursor: "pointer" }}
        >
          Create release candidate
        </button>
      )}
      {error && <p role="alert" style={{ fontFamily: FONT, color: "#f87171", fontSize: "0.8rem" }}>{error}</p>}
      <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.7rem" }}>
        {visible.map((item) => (
          <article key={item.candidate_ref} aria-label={`Release candidate ${item.candidate_ref}`} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "0.9rem" }}>
            <h3 style={{ fontFamily: FONT, fontSize: "0.92rem", margin: 0 }}>{item.candidate_ref}</h3>
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", opacity: 0.7 }}>
              {item.proposal_ref} · {item.status_label} · Live policy: no
            </p>
            <textarea
              readOnly
              aria-label={`Specification for ${item.candidate_ref}`}
              value={item.spec.copyable}
              style={{ width: "100%", minHeight: 140, marginTop: "0.45rem", background: "#11141a", color: "#f0f0f0", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontFamily: FONT, fontSize: "0.72rem", padding: "0.55rem" }}
            />
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0.45rem 0 0" }}>
              Checklist: {item.spec.checklist.join("; ")}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0.25rem 0 0" }}>
              Contract fixtures: {item.fixtures.map((fixture) => fixture.invariant).join(", ")}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0.25rem 0 0" }}>
              {item.issuer_plan?.no_verified_method
                ? "No verified method is available yet."
                : `Eligible issuer/method plan: ${(item.issuer_plan?.entries ?? []).map((entry) => `${entry.label} (${entry.status})`).join(", ") || "planning only"}.`}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.55rem" }}>
              {POLICY_RC_OPERATOR_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={pending === item.id}
                  onClick={() => void decide(item.id, status)}
                  style={{ padding: "0.4rem 0.65rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#f0f0f0", fontFamily: FONT, cursor: "pointer" }}
                >
                  {POLICY_RC_STATE_LABELS[status]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
