"use client";
// FILE: components/admin/ProductionReviewControlPlane.tsx
// Operator production review — application activation, per-binding authorization, credentials.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin/adminFetch";
import { PRODUCTION_REVIEW_NOTICE } from "@/lib/partner/launchpad/productionReview/contract";
import { PRODUCTION_CREDENTIAL_CONFIRMATION } from "@/lib/partner/launchpad/productionCredentials/contract";
import {
  operatorActionConsequence,
  operatorEmptyQueueCopy,
  presentAppProductionQueueItem,
  presentBindingProductionQueueItem,
  productionAuthorizationScopeWarning,
  readinessClassLabel,
} from "@/lib/admin/operatorPresentation";
import {
  OperationalEmptyState,
  OperationalErrorState,
  OperatorActionPanel,
  ReviewQueueCard,
} from "@/components/admin/operator";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

interface BindingQueueItem {
  request_id: string;
  binding_id: string;
  app_label: string;
  partner_id?: string;
  application_id?: string;
  policy_id: string;
  policy_version: number;
  pack_id: string;
  result_family: string;
  binding_role: string;
  production_status: string;
  submitted_note: string | null;
  submitted_at: string;
  decision_status: string;
  verified_receipts: number;
  request_volume: number;
  blockers: string[];
}

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
  credential_state?: "never_issued" | "active" | "revoked" | "unavailable";
}

type ConfirmScope = "app" | "binding" | "credential" | "binding_lifecycle";
type ConfirmDecision = "approve" | "reject" | "issue" | "rotate" | "revoke" | "suspend" | "reactivate";

export function ProductionReviewControlPlane() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [bindingItems, setBindingItems] = useState<BindingQueueItem[]>([]);
  const [activeBindings, setActiveBindings] = useState<BindingQueueItem[]>([]);
  const [approved, setApproved] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [bindingError, setBindingError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmScope, setConfirmScope] = useState<ConfirmScope | null>(null);
  const [confirmDecision, setConfirmDecision] = useState<ConfirmDecision | null>(null);
  const [issuedKey, setIssuedKey] = useState<{ requestId: string; api_key: string; key_prefix: string } | null>(null);
  const [actionSuccess, setActionSuccess] = useState("");

  const clearConfirm = () => {
    setConfirmId(null);
    setConfirmScope(null);
    setConfirmDecision(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setBindingError("");
    setActionSuccess("");
    try {
      const [pendingRes, approvedRes, bindingRes, activeBindingRes] = await Promise.all([
        adminFetch("/api/admin/production-review", { cache: "no-store" }),
        adminFetch("/api/admin/production-review?status=approved", { cache: "no-store" }),
        adminFetch("/api/admin/binding-production-review", { cache: "no-store" }),
        adminFetch("/api/admin/binding-production-review?status=approved", { cache: "no-store" }),
      ]);
      const pendingData = await pendingRes.json() as { items?: QueueItem[]; error?: string };
      const approvedData = await approvedRes.json() as { items?: QueueItem[]; error?: string };
      const bindingData = await bindingRes.json() as { items?: BindingQueueItem[]; error?: string };
      const activeBindingData = await activeBindingRes.json() as { items?: BindingQueueItem[]; error?: string };

      if (!pendingRes.ok) throw new Error(pendingData.error ?? `HTTP ${pendingRes.status}`);
      if (!approvedRes.ok) throw new Error(approvedData.error ?? `HTTP ${approvedRes.status}`);

      setItems(pendingData.items ?? []);
      setApproved(approvedData.items ?? []);

      if (!bindingRes.ok) {
        setBindingItems([]);
        setBindingError(bindingData.error ?? "Binding production queue unavailable");
      } else {
        setBindingItems(bindingData.items ?? []);
      }

      if (!activeBindingRes.ok) {
        setActiveBindings([]);
      } else {
        setActiveBindings((activeBindingData.items ?? []).filter((item) => item.production_status === "production_active" || item.production_status === "production_suspended"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decideBinding(requestId: string, decision: "approve" | "reject") {
    setPendingId(requestId);
    setError("");
    setActionSuccess("");
    try {
      const res = await adminFetch(`/api/admin/binding-production-review/${requestId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, confirm: true }),
      });
      const data = await res.json() as { error?: string; production_status?: string };
      if (!res.ok) throw new Error(data.error ?? "Binding decision failed");
      clearConfirm();
      setActionSuccess(`Binding decision recorded${data.production_status ? `: ${data.production_status.replace(/_/g, " ")}` : ""}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Binding decision failed");
    } finally {
      setPendingId(null);
    }
  }

  async function lifecycleBinding(bindingId: string, decision: "suspend" | "reactivate") {
    setPendingId(bindingId);
    setError("");
    setActionSuccess("");
    try {
      const res = await adminFetch(`/api/admin/binding-production-review/${bindingId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, binding_id: bindingId, confirm: true }),
      });
      const data = await res.json() as { error?: string; production_status?: string };
      if (!res.ok) throw new Error(data.error ?? "Binding lifecycle action failed");
      clearConfirm();
      setActionSuccess(`Binding lifecycle updated${data.production_status ? `: ${data.production_status.replace(/_/g, " ")}` : ""}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Binding lifecycle action failed");
    } finally {
      setPendingId(null);
    }
  }

  async function decide(requestId: string, decision: "approve" | "reject") {
    setPendingId(requestId);
    setError("");
    setActionSuccess("");
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
      clearConfirm();
      setActionSuccess(decision === "approve" ? "Application production activation recorded." : "Application production request rejected.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setPendingId(null);
    }
  }

  async function credential(requestId: string, action: "issue" | "rotate" | "revoke") {
    setPendingId(requestId);
    setError("");
    setActionSuccess("");
    try {
      const res = await adminFetch(`/api/admin/production-review/${requestId}/credential`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirm: true }),
      });
      const data = await res.json() as { error?: string; api_key?: string; key_prefix?: string };
      if (!res.ok) throw new Error(data.error ?? "Credential action failed");
      if (data.api_key && data.key_prefix) {
        setIssuedKey({ requestId, api_key: data.api_key, key_prefix: data.key_prefix });
      } else {
        setIssuedKey(null);
      }
      clearConfirm();
      setActionSuccess(`Credential ${action} completed.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credential action failed");
    } finally {
      setPendingId(null);
    }
  }

  const emptyCopy = operatorEmptyQueueCopy("production review");

  return (
    <div className="abx-admin-page" style={{ padding: "1.5rem clamp(1rem, 3vw, 2rem) 2.5rem", maxWidth: 980, margin: "0 auto" }}>
      <p style={{ fontFamily: FONT, fontSize: "0.58rem", color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
        Operator · Production review
      </p>
      <h1 style={{ fontFamily: FONT, fontSize: "clamp(1.15rem, 2.5vw, 1.35rem)", fontWeight: 800, margin: "0.35rem 0" }}>
        Production review control plane
      </h1>
      <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.6, maxWidth: 720, margin: "0 0 0.65rem" }}>
        {PRODUCTION_REVIEW_NOTICE}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 1rem", color: "rgba(255,255,255,0.55)" }}>
        {productionAuthorizationScopeWarning("application")}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: 0 }}>
        <Link href="/docs/production-review" style={{ color: ACCENT }}>Operator guide</Link>
        {" · "}
        <Link href="/docs/production-credentials" style={{ color: ACCENT }}>Production credentials</Link>
        {" · "}
        <Link href="/admin/partner-flow" style={{ color: ACCENT }}>Partner Flow health</Link>
      </p>

      {loading && <p style={{ fontFamily: FONT, color: "rgba(255,255,255,0.5)", marginTop: "1.25rem" }}>Loading operator queues…</p>}

      {error && (
        <div style={{ marginTop: "1rem" }}>
          <OperationalErrorState message={error} onRetry={() => void load()} />
        </div>
      )}

      {actionSuccess && !error && (
        <p role="status" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#6ee7b7", marginTop: "1rem" }}>
          {actionSuccess}
        </p>
      )}

      <h2 style={{ fontFamily: FONT, fontSize: "1rem", marginTop: "1.5rem" }}>Application production activation</h2>
      {!loading && items.length === 0 && !error && (
        <OperationalEmptyState title={emptyCopy.title} body={emptyCopy.body} />
      )}
      <div style={{ display: "grid", gap: "0.85rem", marginTop: "0.75rem" }}>
        {items.map((item) => {
          const presentation = presentAppProductionQueueItem({
            appLabel: item.app_label,
            policyId: item.policy_id,
            policyVersion: item.policy_version,
            decisionStatus: item.decision_status,
            submittedAt: item.submitted_at,
            sandboxReadinessClass: item.sandbox_readiness_class,
            webhookHealthClass: item.webhook_health_class,
            testConsoleClass: item.test_console_class,
          });
          return (
            <ReviewQueueCard
              key={item.request_ref}
              presentation={presentation}
              decisionPrompt={`Should ${item.app_label} move to production?`}
              evidenceRows={[
                { label: "Sandbox readiness", value: readinessClassLabel(item.sandbox_readiness_class), tone: item.sandbox_readiness_class === "blocked" ? "blocked" : item.sandbox_readiness_class === "attention" ? "watch" : "default" },
                { label: "Test console", value: readinessClassLabel(item.test_console_class) },
                { label: "Webhook health", value: readinessClassLabel(item.webhook_health_class), tone: item.webhook_health_class === "blocked" ? "blocked" : "default" },
                { label: "Policy compatibility", value: readinessClassLabel(item.policy_compatibility_class) },
                { label: "Capabilities", value: item.selected_capabilities.length ? item.selected_capabilities.join(", ") : "None selected" },
                { label: "Partner note", value: item.submitted_note?.trim() || "None submitted" },
              ]}
              technicalDetails={
                <>
                  {item.request_ref} · {item.policy_id} v{item.policy_version}
                </>
              }
              actions={[
                {
                  id: "reject-app",
                  label: "Reject application production request",
                  description: "Partner receives a safe remediation class only.",
                  tone: "reject",
                  disabled: pendingId === item.request_id,
                  onSelect: () => { setConfirmId(item.request_id); setConfirmScope("app"); setConfirmDecision("reject"); },
                },
                {
                  id: "approve-app",
                  label: "Approve application production activation",
                  description: "Promotes environment, pins policy, and issues one abx_live_ credential.",
                  tone: "approve",
                  disabled: pendingId === item.request_id,
                  onSelect: () => { setConfirmId(item.request_id); setConfirmScope("app"); setConfirmDecision("approve"); },
                },
              ]}
              confirmSlot={confirmId === item.request_id && confirmScope === "app" && (confirmDecision === "approve" || confirmDecision === "reject") ? (
                <div role="alertdialog" aria-label="Confirm application production decision" style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: 8, border: "1px solid rgba(16,185,129,0.35)" }}>
                  <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 0.45rem" }}>
                    {operatorActionConsequence({
                      scope: "application",
                      action: confirmDecision === "approve" ? "approve" : "reject",
                      reversible: confirmDecision === "reject",
                    })}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                    <button type="button" onClick={() => void decide(item.request_id, confirmDecision)} style={{ padding: "0.45rem 0.75rem", borderRadius: 8, border: "none", background: ACCENT, color: "#04110c", fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
                      Confirm {confirmDecision}
                    </button>
                    <button type="button" onClick={clearConfirm} style={{ padding: "0.45rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#f0f0f0", fontFamily: FONT, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            />
          );
        })}
      </div>

      <h2 style={{ fontFamily: FONT, fontSize: "1rem", marginTop: "1.75rem" }}>Binding production authorization</h2>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
        {productionAuthorizationScopeWarning("binding")}
      </p>
      {bindingError && (
        <OperationalErrorState
          title="Binding queue unavailable"
          message={`${bindingError}. Application-level items may still be actionable.`}
          onRetry={() => void load()}
        />
      )}
      {!loading && !bindingError && bindingItems.length === 0 && (
        <OperationalEmptyState title={emptyCopy.title} body="No binding production requests are waiting for operator review." />
      )}
      <div style={{ display: "grid", gap: "0.85rem", marginTop: "0.75rem" }}>
        {bindingItems.map((item) => {
          const presentation = presentBindingProductionQueueItem({
            appLabel: item.app_label,
            packId: item.pack_id,
            resultFamily: item.result_family,
            policyVersion: item.policy_version,
            bindingRole: item.binding_role,
            productionStatus: item.production_status,
            decisionStatus: item.decision_status,
            submittedAt: item.submitted_at,
            verifiedReceipts: item.verified_receipts,
            requestVolume: item.request_volume,
            blockers: item.blockers,
          });
          return (
            <ReviewQueueCard
              key={item.request_id}
              presentation={presentation}
              decisionPrompt={`Authorize production for ${item.result_family} on ${item.app_label}?`}
              evidenceRows={[
                { label: "Binding role", value: item.binding_role },
                { label: "Policy pack", value: item.pack_id },
                { label: "Verified receipts", value: String(item.verified_receipts), tone: item.verified_receipts === 0 ? "watch" : "default" },
                { label: "Request volume", value: String(item.request_volume) },
                { label: "Blockers", value: item.blockers.length ? item.blockers.join(", ") : "None reported", tone: item.blockers.length ? "blocked" : "default" },
                { label: "Partner note", value: item.submitted_note?.trim() || "None submitted" },
              ]}
              technicalDetails={
                <>
                  binding {item.binding_id} · {item.policy_id} v{item.policy_version}
                </>
              }
              actions={[
                {
                  id: "reject-binding",
                  label: "Reject binding production",
                  description: "This binding remains sandbox-only. Other bindings are unchanged.",
                  tone: "reject",
                  disabled: pendingId === item.request_id,
                  onSelect: () => { setConfirmId(item.request_id); setConfirmScope("binding"); setConfirmDecision("reject"); },
                },
                {
                  id: "approve-binding",
                  label: "Approve binding production",
                  description: "Authorizes production for this binding only after backend confirmation.",
                  tone: "approve",
                  disabled: pendingId === item.request_id,
                  onSelect: () => { setConfirmId(item.request_id); setConfirmScope("binding"); setConfirmDecision("approve"); },
                },
              ]}
              confirmSlot={confirmId === item.request_id && confirmScope === "binding" && (confirmDecision === "approve" || confirmDecision === "reject") ? (
                <div role="alertdialog" aria-label="Confirm binding production decision" style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: 8, border: "1px solid rgba(16,185,129,0.35)" }}>
                  <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 0.45rem" }}>
                    {operatorActionConsequence({
                      scope: "binding",
                      action: confirmDecision,
                      reversible: confirmDecision === "reject",
                    })}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                    <button type="button" onClick={() => void decideBinding(item.request_id, confirmDecision)} style={{ padding: "0.45rem 0.75rem", borderRadius: 8, border: "none", background: ACCENT, color: "#04110c", fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
                      Confirm {confirmDecision} binding
                    </button>
                    <button type="button" onClick={clearConfirm} style={{ padding: "0.45rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#f0f0f0", fontFamily: FONT, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            />
          );
        })}
      </div>

      {activeBindings.length > 0 && (
        <>
          <h2 style={{ fontFamily: FONT, fontSize: "1rem", marginTop: "1.75rem" }}>Active bindings — lifecycle controls</h2>
          <div style={{ display: "grid", gap: "0.85rem", marginTop: "0.75rem" }}>
            {activeBindings.map((item) => (
              <article key={`active-${item.binding_id}`} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "1rem", background: "rgba(255,255,255,0.03)" }}>
                <h3 style={{ fontFamily: FONT, fontSize: "0.95rem", margin: "0 0 0.35rem" }}>{item.app_label} · {item.result_family}</h3>
                <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.62)", margin: "0 0 0.65rem" }}>
                  Status: {item.production_status.replace(/_/g, " ")} · Binding role: {item.binding_role}
                </p>
                <OperatorActionPanel
                  actions={[
                    item.production_status === "production_active"
                      ? {
                          id: "suspend",
                          label: "Suspend binding production",
                          description: "Fail-closed for this binding until reactivated.",
                          tone: "caution",
                          disabled: pendingId === item.binding_id,
                          onSelect: () => { setConfirmId(item.binding_id); setConfirmScope("binding_lifecycle"); setConfirmDecision("suspend"); },
                        }
                      : {
                          id: "reactivate",
                          label: "Reactivate binding production",
                          description: "Restores production authorization for this binding only.",
                          tone: "neutral",
                          disabled: pendingId === item.binding_id,
                          onSelect: () => { setConfirmId(item.binding_id); setConfirmScope("binding_lifecycle"); setConfirmDecision("reactivate"); },
                        },
                  ]}
                />
                {confirmId === item.binding_id && confirmScope === "binding_lifecycle" && (confirmDecision === "suspend" || confirmDecision === "reactivate") && (
                  <div role="alertdialog" aria-label="Confirm binding lifecycle action" style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: 8, border: "1px solid rgba(245,158,11,0.35)" }}>
                    <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 0.45rem" }}>
                      {operatorActionConsequence({ scope: "binding", action: confirmDecision, reversible: true })}
                    </p>
                    <button type="button" onClick={() => void lifecycleBinding(item.binding_id, confirmDecision)} style={{ padding: "0.45rem 0.75rem", borderRadius: 8, border: "none", background: "#F59E0B", color: "#1a1200", fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
                      Confirm {confirmDecision}
                    </button>
                    <button type="button" onClick={clearConfirm} style={{ marginLeft: "0.45rem", padding: "0.45rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#f0f0f0", fontFamily: FONT, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontFamily: FONT, fontSize: "1rem", marginTop: "1.75rem" }}>Activated — credential lifecycle</h2>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.6 }}>
        Application-level credential controls. Issuing a credential does not authorize additional policy bindings.
      </p>
      {!loading && approved.length === 0 && (
        <OperationalEmptyState title="No activated applications in this view" body="Approved production activations with credential lifecycle controls appear here." />
      )}
      <div style={{ display: "grid", gap: "0.85rem", marginTop: "0.75rem" }}>
        {approved.map((item) => (
          <article key={item.request_ref} aria-label={`Credential lifecycle for ${item.app_label}`} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "1rem", background: "rgba(255,255,255,0.03)" }}>
            <h3 style={{ fontFamily: FONT, fontSize: "1rem", margin: 0 }}>{item.app_label}</h3>
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "rgba(255,255,255,0.62)", margin: "0.35rem 0 0.75rem" }}>
              Credential state: {item.credential_state ?? "never_issued"}
            </p>
            <OperatorActionPanel
              actions={[
                ...((item.credential_state === "never_issued" || !item.credential_state)
                  ? [{
                      id: "issue",
                      label: "Complete activation (issue credential)",
                      description: "Issues abx_live_ once. Secret is not shown again after this response.",
                      tone: "neutral" as const,
                      disabled: pendingId === item.request_id,
                      onSelect: () => { setConfirmId(item.request_id); setConfirmScope("credential"); setConfirmDecision("issue"); },
                    }]
                  : []),
                ...(item.credential_state === "revoked"
                  ? [{
                      id: "reissue",
                      label: "Re-issue after revoke",
                      description: "Creates a new production credential after prior revocation.",
                      tone: "neutral" as const,
                      disabled: pendingId === item.request_id,
                      onSelect: () => { setConfirmId(item.request_id); setConfirmScope("credential"); setConfirmDecision("issue"); },
                    }]
                  : []),
                ...(item.credential_state === "active"
                  ? [
                      {
                        id: "rotate",
                        label: "Rotate production credential",
                        description: "Invalidates the prior key and issues a replacement.",
                        tone: "caution" as const,
                        disabled: pendingId === item.request_id,
                        onSelect: () => { setConfirmId(item.request_id); setConfirmScope("credential"); setConfirmDecision("rotate"); },
                      },
                      {
                        id: "revoke",
                        label: "Revoke production credential",
                        description: "Fail-closed until a new credential is issued.",
                        tone: "reject" as const,
                        disabled: pendingId === item.request_id,
                        onSelect: () => { setConfirmId(item.request_id); setConfirmScope("credential"); setConfirmDecision("revoke"); },
                      },
                    ]
                  : []),
              ]}
            />
            {confirmId === item.request_id && confirmScope === "credential" && confirmDecision && ["issue", "rotate", "revoke"].includes(confirmDecision) && (
              <div role="alertdialog" aria-label="Confirm production credential action" style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: 8, border: "1px solid rgba(16,185,129,0.35)" }}>
                <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: "0 0 0.45rem" }}>{PRODUCTION_CREDENTIAL_CONFIRMATION}</p>
                <p style={{ fontFamily: FONT, fontSize: "0.74rem", margin: "0 0 0.45rem", color: "rgba(255,255,255,0.62)" }}>
                  {operatorActionConsequence({ scope: "credential", action: confirmDecision, reversible: confirmDecision === "rotate" })}
                </p>
                <button type="button" onClick={() => void credential(item.request_id, confirmDecision as "issue" | "rotate" | "revoke")} style={{ padding: "0.45rem 0.75rem", borderRadius: 8, border: "none", background: ACCENT, color: "#04110c", fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>
                  Confirm {confirmDecision}
                </button>
                <button type="button" onClick={clearConfirm} style={{ marginLeft: "0.45rem", padding: "0.45rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#f0f0f0", fontFamily: FONT, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            )}
            {issuedKey?.requestId === item.request_id && (
              <div role="status" style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: 8, border: "1px solid rgba(250,204,21,0.4)" }}>
                <p style={{ fontFamily: FONT, fontSize: "0.78rem", margin: 0 }}>Raw credential shown once. Store it now. It will not appear in later GET responses.</p>
                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", margin: "0.45rem 0 0", wordBreak: "break-all" }}>{issuedKey.api_key}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
