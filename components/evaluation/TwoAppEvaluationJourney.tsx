"use client";
// FILE: components/evaluation/TwoAppEvaluationJourney.tsx
// Guided two-app reuse evaluation journey — event-backed checklists only.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type ChecklistItem = {
  id: string;
  label: string;
  status: string;
  failure_reason: string | null;
};

type EvaluationPayload = {
  evaluation_id: string;
  stage: string;
  commercial_success_event: string;
  evidence_classification: string;
  classification_source: string | null;
  technical_evaluation_status: string;
  external_proof_eligibility: string;
  reuse: { status: string; safe_reason: string | null };
  reuse_metrics: {
    underlying_verification_events: number | null;
    applications_with_verified_results: number;
    additional_raw_kyc_recollections: number | null;
    reuse_status: string;
    metrics_quality: string;
  };
  app_a: { display_name: string; items: ChecklistItem[]; server_verification_passed: boolean };
  app_b: { display_name: string; items: ChecklistItem[]; server_verification_passed: boolean };
  partner_summary: { headline: string; bullets: string[]; evidence_status: string } | null;
  blockers: string[];
  target_policy_pack: string;
  time_to_value: { notice: string };
};

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

function statusColor(status: string): string {
  if (status === "observed") return "#2DD4BF";
  if (status === "failed") return "#F87171";
  return "var(--text-muted)";
}

function Checklist({ title, items }: { title: string; items: ChecklistItem[] }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 0.5rem", fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>
        {title}
      </h3>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: "0.4rem" }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "0.55rem",
              padding: "0.55rem 0.65rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface-inset)",
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: "0.65rem", fontWeight: 800, color: statusColor(item.status), textTransform: "uppercase" }}>
              {item.status.replace(/_/g, " ")}
            </span>
            <div>
              <div style={{ ...body, color: "var(--text-primary)", fontWeight: 600 }}>{item.label}</div>
              {item.failure_reason && (
                <div style={{ ...body, fontSize: "0.76rem", color: "#FBBF24", marginTop: "0.25rem" }}>
                  {item.failure_reason}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TwoAppEvaluationJourney({ evaluationId }: { evaluationId: string | null }) {
  const [data, setData] = useState<EvaluationPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(evaluationId);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evaluation/two-app/${id}`);
      const json = await res.json() as { ok?: boolean; evaluation?: EvaluationPayload; error?: string };
      if (!res.ok || !json.evaluation) throw new Error(json.error ?? "load_failed");
      setData(json.evaluation);
      setActiveId(id);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("abx_two_app_eval_id", id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load evaluation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fromSession = typeof window !== "undefined"
      ? window.sessionStorage.getItem("abx_two_app_eval_id")
      : null;
    const id = evaluationId ?? fromSession;
    if (id) void load(id);
  }, [evaluationId, load]);

  async function startEvaluation() {
    setStarting(true);
    setError(null);
    try {
      const sandboxId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}${Math.random()}`;
      const res = await fetch("/api/evaluation/two-app/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sandbox_id: sandboxId,
          partner_label: "two-app-eval",
          return_url: `${window.location.origin}/evaluation/two-app/callback`,
        }),
      });
      const json = await res.json() as { ok?: boolean; evaluation_id?: string; error?: string };
      if (!res.ok || !json.evaluation_id) throw new Error(json.error ?? "start_failed");
      await load(json.evaluation_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start evaluation");
    } finally {
      setStarting(false);
    }
  }

  const reuseConfirmed = data?.reuse.status === "accepted"
    && data.app_a.server_verification_passed
    && data.app_b.server_verification_passed;

  return (
    <div style={{ display: "grid", gap: "1rem", textAlign: "left" }}>
      {!activeId && (
        <ContentCard title="Start two-app evaluation">
          <p style={body}>
            Create App A and App B sandbox applications with one compatible reuse policy.
            Evidence remains <strong style={{ color: "var(--text-primary)" }}>NOT YET OBSERVED</strong> until your team completes verification and reuse.
          </p>
          <Btn size="lg" onClick={() => void startEvaluation()} disabled={starting}>
            {starting ? "Creating sandbox pair…" : "Create two-app sandbox"}
          </Btn>
        </ContentCard>
      )}

      {error && (
        <ContentCard title="Something needs attention">
          <p style={{ ...body, color: "#FBBF24" }}>{error}</p>
        </ContentCard>
      )}

      {loading && <p style={body}>Loading evaluation status…</p>}

      {data && (
        <>
          <ContentCard title="Evaluation status">
            <p style={body}>
              Stage: <strong style={{ color: "var(--accent)", fontFamily: MONO }}>{data.stage.replace(/_/g, " ")}</strong>
              {" · "}
              Classification: <strong style={{ color: data.evidence_classification === "UNCLASSIFIED_SANDBOX" ? "#FBBF24" : "var(--text-primary)" }}>
                {data.evidence_classification.replace(/_/g, " ")}
              </strong>
            </p>
            <p style={{ ...body, fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Technical evaluation: {data.technical_evaluation_status.replace(/_/g, " ")}
              {" · "}
              External proof eligibility: {data.external_proof_eligibility.replace(/_/g, " ")}
            </p>
            {data.evidence_classification === "UNCLASSIFIED_SANDBOX" && (
              <p style={{ ...body, fontSize: "0.76rem", color: "#FBBF24", marginTop: "0.35rem" }}>
                Evaluator identity is unclassified. Technical success does not establish external customer proof.
              </p>
            )}
            <p style={{ ...body, fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Commercial success event: {data.commercial_success_event.replace(/_/g, " ")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
              <Btn size="sm" variant="secondary" onClick={() => activeId && void load(activeId)}>Refresh status</Btn>
              <Btn href={`/developers/launchpad`} size="sm" variant="ghost">Open Launchpad</Btn>
              <Btn href={`/developers/integration-studio?outcome=reuse_across_app&path=verify_with_abraxas&pack=identity_liveness&source=two-app-eval`} size="sm" variant="ghost">Integration Studio</Btn>
            </div>
          </ContentCard>

          <ContentCard title="Step 1 — Configure App A and get first verified result">
            <Checklist title={data.app_a.display_name} items={data.app_a.items} />
          </ContentCard>

          <ContentCard title="Step 2 — Configure App B and reuse compatible evidence">
            <p style={{ ...body, marginBottom: "0.75rem" }}>
              Now prove the same trusted evidence can satisfy another application without starting verification from scratch.
            </p>
            <Checklist title={data.app_b.display_name} items={data.app_b.items} />
          </ContentCard>

          {reuseConfirmed && (
            <ContentCard title="VERIFICATION REUSED">
              <p style={{ ...body, fontWeight: 700, color: "#2DD4BF" }}>Reuse observed in your sandbox evaluation.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))", gap: "0.55rem", marginTop: "0.75rem" }}>
                {[
                  ["Underlying verification events", data.reuse_metrics.underlying_verification_events ?? "—"],
                  ["Applications with verified results", data.reuse_metrics.applications_with_verified_results],
                  ["Additional raw KYC recollections", data.reuse_metrics.additional_raw_kyc_recollections ?? "—"],
                  ["Reuse status", data.reuse_metrics.reuse_status],
                ].map(([label, value]) => (
                  <div key={String(label)} style={{ padding: "0.75rem", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-inset)" }}>
                    <div style={{ fontFamily: MONO, fontSize: "1rem", fontWeight: 800, color: "var(--accent)" }}>{value}</div>
                    <div style={{ ...body, fontSize: "0.72rem", marginTop: "0.2rem" }}>{label}</div>
                  </div>
                ))}
              </div>
              <p style={{ ...body, fontSize: "0.72rem", marginTop: "0.65rem", color: "var(--text-muted)" }}>
                Observed evaluation metrics only — not reference harness numbers.
              </p>
            </ContentCard>
          )}

          {data.partner_summary && (
            <ContentCard title={data.partner_summary.headline}>
              <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.35rem" }}>
                {data.partner_summary.bullets.map((b) => (
                  <li key={b} style={body}>{b}</li>
                ))}
              </ul>
              <p style={{ ...body, fontSize: "0.76rem", marginTop: "0.65rem", color: "var(--text-muted)" }}>
                Evidence status: {data.partner_summary.evidence_status}
              </p>
            </ContentCard>
          )}

          {data.blockers.length > 0 && (
            <ContentCard title="Blockers detected">
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {data.blockers.map((b) => (
                  <li key={b} style={body}>{b.replace(/_/g, " ")}</li>
                ))}
              </ul>
              {data.reuse.safe_reason && (
                <p style={{ ...body, marginTop: "0.65rem", color: "#FBBF24" }}>{data.reuse.safe_reason}</p>
              )}
            </ContentCard>
          )}

          <p style={{ ...body, fontSize: "0.72rem", color: "var(--text-muted)" }}>{data.time_to_value.notice}</p>
          <Link href="/proof" style={{ color: "var(--accent)", fontSize: "0.82rem", fontWeight: 700 }}>
            ← Back to reference proof
          </Link>
        </>
      )}
    </div>
  );
}
