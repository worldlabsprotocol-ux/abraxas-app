"use client";
// FILE: components/evaluation/TwoAppEvaluationJourney.tsx
// Guided two-app reuse evaluation journey — event-backed checklists only.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import {
  buildEvaluationProgressSteps,
  deriveEvaluationNextStep,
  humanStageLabel,
} from "@/lib/partner/twoAppEvaluation/evaluationUx";
import { EvaluationProgressStrip } from "@/components/evaluation/EvaluationProgressStrip";
import { EvaluationNextStepCard } from "@/components/evaluation/EvaluationNextStepCard";
import { ReuseCausalityPanel } from "@/components/evaluation/ReuseCausalityPanel";
import { PolicyDisclosurePanel } from "@/components/evaluation/PolicyDisclosurePanel";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type ChecklistItem = {
  id: string;
  label: string;
  status: string;
  failure_reason: string | null;
};

type StartCredentials = {
  evaluation_id: string;
  partner_id: string;
  app_a: { application_id: string; display_name: string };
  app_b: { application_id: string; display_name: string };
  api_keys: { app_a: string | null; app_b: string | null };
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
  app_a: {
    application_id: string;
    display_name: string;
    items: ChecklistItem[];
    server_verification_passed: boolean;
  };
  app_b: {
    application_id: string;
    display_name: string;
    items: ChecklistItem[];
    server_verification_passed: boolean;
  };
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

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-muted)" }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center", marginTop: "0.2rem" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.78rem", wordBreak: "break-all", flex: "1 1 12rem" }}>{value}</div>
        <Btn size="sm" variant="ghost" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Btn>
      </div>
    </div>
  );
}

export function TwoAppEvaluationJourney({ evaluationId }: { evaluationId: string | null }) {
  const [data, setData] = useState<EvaluationPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(evaluationId);
  const [startCredentials, setStartCredentials] = useState<StartCredentials | null>(null);
  const [credentialsAcknowledged, setCredentialsAcknowledged] = useState(false);

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
      const json = await res.json() as {
        ok?: boolean;
        evaluation_id?: string;
        partner_id?: string;
        app_a?: StartCredentials["app_a"];
        app_b?: StartCredentials["app_b"];
        api_keys?: StartCredentials["api_keys"];
        error?: string;
      };
      if (!res.ok || !json.evaluation_id || !json.partner_id || !json.app_a || !json.app_b) {
        throw new Error(json.error ?? "start_failed");
      }
      setStartCredentials({
        evaluation_id: json.evaluation_id,
        partner_id: json.partner_id,
        app_a: json.app_a,
        app_b: json.app_b,
        api_keys: json.api_keys ?? { app_a: null, app_b: null },
      });
      setCredentialsAcknowledged(false);
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

  const progressSteps = useMemo(() => {
    if (!data) return [];
    return buildEvaluationProgressSteps({
      stage: data.stage,
      app_a_verified: data.app_a.server_verification_passed,
      app_b_verified: data.app_b.server_verification_passed,
      reuse_accepted: data.reuse.status === "accepted",
    });
  }, [data]);

  const nextStep = useMemo(() => {
    if (!data || !activeId) return null;
    return deriveEvaluationNextStep({
      stage: data.stage,
      app_a: data.app_a,
      app_b: data.app_b,
      reuse_status: data.reuse.status,
      evaluation_id: activeId,
    });
  }, [data, activeId]);

  return (
    <div style={{ display: "grid", gap: "1rem", textAlign: "left" }}>
      {!activeId && (
        <ContentCard title="Start two-app evaluation">
          <p style={body}>
            Create App A and App B sandbox applications with one compatible reuse policy.
            Evidence remains <strong style={{ color: "var(--text-primary)" }}>not yet observed</strong> until your team completes verification and reuse.
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

      {startCredentials && !credentialsAcknowledged && (
        <ContentCard title="Sandbox credentials — shown once">
          <p style={body}>
            Store these server-side only. Abraxas does not show raw sandbox API keys again after you leave this screen.
            Use a key to sign in at{" "}
            <Link href="/developers/launchpad" style={{ color: "var(--accent)", fontWeight: 700 }}>Launchpad</Link>
            {" "}and configure each application.
          </p>
          <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.75rem" }}>
            {([
              ["App A", startCredentials.app_a, startCredentials.api_keys.app_a],
              ["App B", startCredentials.app_b, startCredentials.api_keys.app_b],
            ] as const).map(([label, app, apiKey]) => (
              <div
                key={app.application_id}
                style={{
                  padding: "0.75rem",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface-inset)",
                }}
              >
                <div style={{ fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>{label}</div>
                <CopyField label="application_id" value={app.application_id} />
                <div style={{ marginTop: "0.45rem" }}>
                  {apiKey ? (
                    <CopyField label="sandbox API key" value={apiKey} />
                  ) : (
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--text-muted)" }}>sandbox API key</div>
                      <div style={{ fontFamily: MONO, fontSize: "0.78rem", color: "#FBBF24", marginTop: "0.2rem" }}>
                        Not returned (idempotent replay). Rotate in Launchpad after sign-in.
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: "0.55rem" }}>
                  <Btn href={`/developers/launchpad?app=${encodeURIComponent(app.application_id)}&view=configure`} size="sm" variant="ghost">
                    Configure {label}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
          <p style={{ ...body, fontSize: "0.76rem", marginTop: "0.65rem", color: "var(--text-muted)" }}>
            Partner ID: <span style={{ fontFamily: MONO }}>{startCredentials.partner_id}</span>
            {" · "}
            Quickstart:{" "}
            <Link href="/docs/VERIFY_WITH_ABRAXAS_QUICKSTART" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Verify with Abraxas
            </Link>
          </p>
          <div style={{ marginTop: "0.75rem" }}>
            <Btn
              size="sm"
              onClick={() => {
                setCredentialsAcknowledged(true);
                setStartCredentials(null);
              }}
            >
              I stored the credentials server-side
            </Btn>
          </div>
        </ContentCard>
      )}

      {data && (
        <>
          <EvaluationProgressStrip steps={progressSteps} stageLabel={humanStageLabel(data.stage)} />

          {nextStep && activeId && (
            <EvaluationNextStepCard
              next={nextStep}
              evaluationId={activeId}
              onRefresh={() => void load(activeId)}
            />
          )}

          <ContentCard title="What each application receives">
            <p style={{ ...body, marginBottom: "0.65rem" }}>
              Policy pack: <strong style={{ color: "var(--text-primary)", fontFamily: MONO }}>{data.target_policy_pack.replace(/_/g, " ")}</strong>
            </p>
            <PolicyDisclosurePanel packId={data.target_policy_pack} />
          </ContentCard>

          <ContentCard title="Evaluation status">
            <p style={body}>
              Stage: <strong style={{ color: "var(--accent)" }}>{humanStageLabel(data.stage)}</strong>
              {" · "}
              Classification: <strong style={{ color: data.evidence_classification === "UNCLASSIFIED_SANDBOX" ? "#FBBF24" : "var(--text-primary)" }}>
                {data.evidence_classification.replace(/_/g, " ")}
              </strong>
            </p>
            {data.evidence_classification === "UNCLASSIFIED_SANDBOX" && (
              <p style={{ ...body, fontSize: "0.76rem", color: "#FBBF24", marginTop: "0.35rem" }}>
                Evaluator identity is unclassified. Technical success does not establish external customer proof.
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
              <Btn size="sm" variant="secondary" onClick={() => activeId && void load(activeId)} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh status"}
              </Btn>
              <Btn href="/developers/launchpad" size="sm" variant="ghost">Launchpad</Btn>
            </div>
          </ContentCard>

          <ContentCard title="Step 1 — Configure App A and get first verified result">
            <Checklist title={data.app_a.display_name} items={data.app_a.items} />
          </ContentCard>

          <ContentCard title="Step 2 — Configure App B and reuse compatible evidence">
            <p style={{ ...body, marginBottom: "0.75rem" }}>
              Prove the same trusted evidence can satisfy another application without starting verification from scratch.
            </p>
            <Checklist title={data.app_b.display_name} items={data.app_b.items} />
          </ContentCard>

          {reuseConfirmed && (
            <ContentCard title="Reuse observed">
              <ReuseCausalityPanel
                appAName={data.app_a.display_name}
                appBName={data.app_b.display_name}
                metrics={data.reuse_metrics}
              />
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
