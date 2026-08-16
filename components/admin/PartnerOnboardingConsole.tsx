"use client";
// FILE: components/admin/PartnerOnboardingConsole.tsx
// Admin-only relying-party onboarding console (pilot provisioning + readiness).

import { useCallback, useEffect, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

type ReadinessLevel = "pass" | "fail" | "pending";

interface PartnerDetail {
  partner_id: string;
  company: string;
  status: string;
  is_external: boolean;
  allowed_environments: string[];
  allowed_return_urls: string[];
  assigned_policy_id: string | null;
  use_case: string | null;
  active_policy: { id: string; version: number; status: string; name: string } | null;
  draft_policy: { id: string; version: number; status: string; name: string } | null;
  readiness: {
    partner_row: ReadinessLevel;
    active_policy: ReadinessLevel;
    callback_allowlist: ReadinessLevel;
    conformance_config: ReadinessLevel;
    overall: "ready" | "not_ready";
    blockers: string[];
  };
  pilot_checklist: Array<{ id: string; label: string; done: boolean; operator_note: string }>;
  conformance_command: string | null;
}

function readinessColor(level: ReadinessLevel | "ready" | "not_ready"): string {
  if (level === "pass" || level === "ready") return ACCENT;
  if (level === "pending") return "#F59E0B";
  return "#F87171";
}

export function PartnerOnboardingConsole({ adminPin = "" }: { adminPin?: string }) {
  const [partners, setPartners] = useState<PartnerDetail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newPartnerId, setNewPartnerId] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newUseCase, setNewUseCase] = useState("");

  const [callbackUrl, setCallbackUrl] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [policyName, setPolicyName] = useState("");
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();

  const headers = useCallback((): HeadersInit => {
    const h: HeadersInit = { "Content-Type": "application/json" };
    if (adminPin) h["x-admin-pin"] = adminPin;
    return h;
  }, [adminPin]);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partners/onboarding", {
        headers: adminPin ? { "x-admin-pin": adminPin } : undefined,
        credentials: "include",
      });
      const data = await res.json() as { partners?: PartnerDetail[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load partners");
      setPartners(data.partners ?? []);
      if (!selectedId && data.partners?.[0]) {
        setSelectedId(data.partners[0].partner_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [adminPin, selectedId]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const selected = partners.find(p => p.partner_id === selectedId) ?? null;

  async function createPartner() {
    if (!newPartnerId.trim() || !newCompany.trim()) {
      setError("Partner ID and company required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const id = newPartnerId.trim();
      const res = await fetch("/api/admin/partners/onboarding", {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify({
          partner_id: id,
          company: newCompany.trim(),
          use_case: newUseCase.trim() || undefined,
          status: "pilot",
          allowed_environments: ["sandbox"],
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setNewPartnerId("");
      setNewCompany("");
      setNewUseCase("");
      await loadPartners();
      setSelectedId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function addCallbackUrl() {
    if (!selected || !callbackUrl.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partners/onboarding/return-urls", {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify({
          partner_id: selected.partner_id,
          return_urls: [callbackUrl.trim()],
        }),
      });
      const data = await res.json() as { error?: string; rejected?: Array<{ url: string; errors: string[] }> };
      if (!res.ok) throw new Error(data.error ?? "Add callback URL failed");
      setCallbackUrl("");
      await loadPartners();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add callback URL failed");
    } finally {
      setLoading(false);
    }
  }

  async function createPolicyDraft() {
    if (!selected || !policyId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partners/onboarding/policies", {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify({
          action: "create_initial_draft",
          partner_id: selected.partner_id,
          policy_id: policyId.trim(),
          name: policyName.trim() || `${selected.partner_id} pilot policy`,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create policy draft failed");
      setPolicyId("");
      setPolicyName("");
      await loadPartners();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create policy draft failed");
    } finally {
      setLoading(false);
    }
  }

  async function executePublishDraft() {
    if (!selected?.draft_policy) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partners/onboarding/policies", {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify({
          action: "publish",
          partner_id: selected.partner_id,
          policy_id: selected.draft_policy.id,
          version: selected.draft_policy.version,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      await loadPartners();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setLoading(false);
    }
  }

  function promptPublishDraft() {
    if (!selected?.draft_policy) return;
    requestConfirm({
      actionKey: "policy.publish",
      context: {
        partnerId: selected.partner_id,
        policyId: selected.draft_policy.id,
        version: selected.draft_policy.version,
      },
      onConfirmed: () => executePublishDraft(),
    });
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.55rem 0.75rem",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#f0f0f0",
    fontFamily: MONO,
    fontSize: "0.72rem",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "1rem" }}>
        Provision pilot relying parties without manual SQL. Creates partners in <strong>pilot</strong> state only.
        Policies are draft until published via the immutable-policy workflow. No API key secrets are shown here.
      </p>

      {error && (
        <div style={{
          padding: "0.65rem 0.85rem", borderRadius: 8, marginBottom: "1rem",
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
          fontFamily: FONT, fontSize: "0.75rem", color: "#FCA5A5",
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 280px) 1fr", gap: "1rem", alignItems: "start" }}>
        <div style={{
          padding: "0.85rem", borderRadius: 10,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
            Partners
          </div>
          <button type="button" onClick={() => void loadPartners()} disabled={loading}
            style={{ marginBottom: "0.65rem", padding: "0.4rem 0.75rem", borderRadius: 6, border: "none", background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: 360, overflowY: "auto" }}>
            {partners.map(p => (
              <button key={p.partner_id} type="button" onClick={() => setSelectedId(p.partner_id)}
                style={{
                  textAlign: "left", padding: "0.55rem 0.65rem", borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${selectedId === p.partner_id ? `${ACCENT}66` : "rgba(255,255,255,0.08)"}`,
                  background: selectedId === p.partner_id ? "rgba(16,185,129,0.12)" : "transparent",
                  color: "#f0f0f0",
                }}>
                <div style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700 }}>{p.company}</div>
                <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                  {p.partner_id} · {p.status}
                </div>
                <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: readinessColor(p.readiness.overall), marginTop: 4 }}>
                  {p.readiness.overall === "ready" ? "Ready for conformance" : "Not ready"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {selected ? (
            <>
              <section style={{ padding: "1rem", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                  Readiness (read-only)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  {([
                    ["partner_row", "Partner row"],
                    ["active_policy", "Active policy"],
                    ["callback_allowlist", "Callback allowlist"],
                    ["conformance_config", "Conformance config"],
                  ] as const).map(([key, label]) => (
                    <div key={key} style={{ fontFamily: FONT, fontSize: "0.68rem" }}>
                      <span style={{ color: readinessColor(selected.readiness[key]) }}>●</span> {label}: {selected.readiness[key]}
                    </div>
                  ))}
                </div>
                {selected.readiness.blockers.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.55)" }}>
                    {selected.readiness.blockers.map(b => <li key={b}>{b}</li>)}
                  </ul>
                )}
                <div style={{ marginTop: "0.75rem", fontFamily: MONO, fontSize: "0.62rem", color: "rgba(255,255,255,0.45)" }}>
                  Environments: {selected.allowed_environments.join(", ") || "—"}
                  <br />
                  Return URLs: {selected.allowed_return_urls.length ? selected.allowed_return_urls.join(" · ") : "—"}
                  <br />
                  Active policy: {selected.active_policy ? `${selected.active_policy.id} v${selected.active_policy.version}` : "—"}
                  {selected.draft_policy ? ` · Draft v${selected.draft_policy.version}` : ""}
                </div>
              </section>

              <section style={{ padding: "1rem", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                  Second partner pilot checklist
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {selected.pilot_checklist.map(item => (
                    <div key={item.id} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.7)" }}>
                      <span style={{ color: item.done ? ACCENT : "rgba(255,255,255,0.35)" }}>{item.done ? "✓" : "○"}</span>
                      {" "}{item.label}
                      <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "rgba(255,255,255,0.4)", marginLeft: "1.1rem" }}>
                        {item.operator_note}
                      </div>
                    </div>
                  ))}
                </div>
                {selected.conformance_command && (
                  <pre style={{
                    marginTop: "0.75rem", padding: "0.65rem", borderRadius: 8, overflowX: "auto",
                    background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: MONO, fontSize: "0.6rem", color: "#A7F3D0",
                  }}>
                    {selected.conformance_command}
                  </pre>
                )}
              </section>

              <section style={{ padding: "1rem", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                  Add callback URL (HTTPS, exact path)
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <input value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)} placeholder="https://your-app.example.com/auth/abraxas/callback" style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
                  <button type="button" onClick={() => void addCallbackUrl()} disabled={loading}
                    style={{ padding: "0.55rem 1rem", borderRadius: 8, border: "none", background: "rgba(16,185,129,0.25)", color: ACCENT, fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                    Add URL
                  </button>
                </div>
              </section>

              <section style={{ padding: "1rem", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                  Policy (draft → publish)
                </div>
                {!selected.draft_policy && !selected.active_policy && (
                  <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.65rem" }}>
                    <input value={policyId} onChange={e => setPolicyId(e.target.value)} placeholder="policy_id (e.g. your-protocol-policy-v1)" style={inputStyle} />
                    <input value={policyName} onChange={e => setPolicyName(e.target.value)} placeholder="Policy display name (optional)" style={inputStyle} />
                    <button type="button" onClick={() => void createPolicyDraft()} disabled={loading}
                      style={{ padding: "0.55rem 1rem", borderRadius: 8, border: "none", background: "rgba(16,185,129,0.25)", color: ACCENT, fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", justifySelf: "start" }}>
                      Create draft policy
                    </button>
                  </div>
                )}
                {selected.draft_policy && (
                  <div>
                    <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", marginTop: 0 }}>
                      Draft {selected.draft_policy.id} v{selected.draft_policy.version} — publish to activate (immutable after publish).
                    </p>
                    <button type="button" onClick={() => promptPublishDraft()} disabled={loading || confirmDialogProps.busy}
                      style={{ padding: "0.55rem 1rem", borderRadius: 8, border: "none", background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                      Publish draft
                    </button>
                  </div>
                )}
                {selected.active_policy && !selected.draft_policy && (
                  <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", margin: 0 }}>
                    Active {selected.active_policy.id} v{selected.active_policy.version}. Use /api/admin/policies/versions to create a new draft from active for rule changes.
                  </p>
                )}
              </section>
            </>
          ) : (
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>
              Select a partner or create one below.
            </div>
          )}

          <section style={{ padding: "1rem", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
              Create pilot partner
            </div>
            <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.65rem" }}>
              <input value={newPartnerId} onChange={e => setNewPartnerId(e.target.value)} placeholder="partner_id" style={inputStyle} />
              <input value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Company name" style={inputStyle} />
              <input value={newUseCase} onChange={e => setNewUseCase(e.target.value)} placeholder="Use case (optional)" style={inputStyle} />
            </div>
            <button type="button" onClick={() => void createPartner()} disabled={loading}
              style={{ padding: "0.55rem 1rem", borderRadius: 8, border: "none", background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
              Create pilot partner
            </button>
          </section>
        </div>
      </div>
      <AdminConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
