"use client";
// FILE: app/admin/partners/page.tsx
// Issue and revoke partner API keys for verify endpoints.

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "";
const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";

interface PartnerKeyRow {
  id: string;
  partner_id: string;
  display_name: string;
  key_prefix: string;
  scopes: string[];
  revoked_at: string | null;
  created_at: string;
  last_used_at: string | null;
}

export default function AdminPartnersPage() {
  const [pin, setPin] = useState(ADMIN_PIN);
  const [keys, setKeys] = useState<PartnerKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [keyEnvironment, setKeyEnvironment] = useState<"live" | "test">("live");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [orgPartnerId, setOrgPartnerId] = useState("");
  const [company, setCompany] = useState("");
  const [legalEntity, setLegalEntity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const [assignedPolicy, setAssignedPolicy] = useState("");
  const [allowedEnv, setAllowedEnv] = useState<"sandbox" | "production">("sandbox");
  const [partners, setPartners] = useState<Array<{
    partner_id: string;
    company: string;
    status: string;
    legal_entity?: string | null;
    use_case?: string | null;
    assigned_policy_id?: string | null;
    usage_count?: number;
    consent_count?: number;
  }>>([]);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [keysRes, partnersRes] = await Promise.all([
        fetch("/api/admin/partner-keys", { headers: { "x-admin-pin": pin } }),
        fetch("/api/admin/partners", { headers: { "x-admin-pin": pin } }),
      ]);
      const keysData = await keysRes.json() as { keys?: PartnerKeyRow[]; error?: string };
      const partnersData = await partnersRes.json() as {
        partners?: Array<{
          partner_id: string;
          company: string;
          status: string;
          legal_entity?: string | null;
          use_case?: string | null;
          assigned_policy_id?: string | null;
          usage_count?: number;
          consent_count?: number;
        }>;
        error?: string;
      };
      if (!keysRes.ok) throw new Error(keysData.error ?? "Failed to load keys");
      setKeys(keysData.keys ?? []);
      setPartners(partnersData.partners ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [pin]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function createKey() {
    if (!partnerId.trim() || !displayName.trim()) {
      setError("Partner ID and display name required.");
      return;
    }
    setLoading(true);
    setError("");
    setNewKey(null);
    try {
      const res = await fetch("/api/admin/partner-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({
          partner_id: partnerId.trim(),
          display_name: displayName.trim(),
          environment: keyEnvironment,
        }),
      });
      const data = await res.json() as { api_key?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setNewKey(data.api_key ?? null);
      setPartnerId("");
      setDisplayName("");
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function createPartnerOrg() {
    if (!orgPartnerId.trim() || !company.trim()) {
      setError("Partner ID and company required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({
          partner_id: orgPartnerId.trim(),
          company: company.trim(),
          legal_entity: legalEntity.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          use_case: useCase.trim() || undefined,
          assigned_policy_id: assignedPolicy.trim() || undefined,
          allowed_environments: [allowedEnv],
          status: allowedEnv === "production" ? "active" : "recruiting",
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Create partner failed");
      setOrgPartnerId("");
      setCompany("");
      setLegalEntity("");
      setContactEmail("");
      setUseCase("");
      setAssignedPolicy("");
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create partner failed");
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this API key? Partner integrations will stop working immediately.")) return;
    setActionId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/partner-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({ id, revoke: true }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Revoke failed");
      await loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c10", color: "#f0f0f0", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "#10B981", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Pilot · Partner API
            </div>
            <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
              Partner onboarding
            </h1>
          </div>
          <Link href="/admin/identity" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "#10B981", textDecoration: "none" }}>
            ← Identity queue
          </Link>
        </div>

        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
          Issue keys for relying parties calling{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>POST /api/credentials/verify</code> and{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>POST /api/v1/verification-requests</code>.
          Register the org first, assign a policy, then issue sandbox or live keys. Real external partners require signed agreement before production keys.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Admin PIN"
            style={{
              padding: "0.55rem 0.75rem", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
              color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem",
            }}
          />
          <button
            onClick={() => void loadKeys()}
            disabled={loading}
            style={{
              padding: "0.55rem 1rem", borderRadius: 8, border: "none",
              background: "#10B981", color: "#000", fontFamily: FONT, fontSize: "0.78rem",
              fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div style={{
          padding: "1rem", borderRadius: 10, marginBottom: "1.25rem",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Register relying party org
          </div>
          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input value={orgPartnerId} onChange={e => setOrgPartnerId(e.target.value)} placeholder="partner_id (e.g. acme-lending)"
              style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem", width: "100%", boxSizing: "border-box" }} />
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name (public)"
              style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: FONT, fontSize: "0.78rem", width: "100%", boxSizing: "border-box" }} />
            <input value={legalEntity} onChange={e => setLegalEntity(e.target.value)} placeholder="Legal entity (optional)"
              style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: FONT, fontSize: "0.78rem", width: "100%", boxSizing: "border-box" }} />
            <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Contact email"
              style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: FONT, fontSize: "0.78rem", width: "100%", boxSizing: "border-box" }} />
            <input value={useCase} onChange={e => setUseCase(e.target.value)} placeholder="Use case (e.g. investor onboarding gate)"
              style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: FONT, fontSize: "0.78rem", width: "100%", boxSizing: "border-box" }} />
            <input value={assignedPolicy} onChange={e => setAssignedPolicy(e.target.value)} placeholder="Assigned policy_id (optional)"
              style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem", width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {(["sandbox", "production"] as const).map(env => (
              <button key={env} type="button" onClick={() => setAllowedEnv(env)}
                style={{
                  padding: "0.4rem 0.75rem", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${allowedEnv === env ? "#10B981" : "rgba(255,255,255,0.12)"}`,
                  background: allowedEnv === env ? "rgba(16,185,129,0.15)" : "transparent",
                  color: allowedEnv === env ? "#10B981" : "rgba(255,255,255,0.45)",
                  fontFamily: MONO, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
                }}>
                {env}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void createPartnerOrg()} disabled={loading}
            style={{ padding: "0.55rem 1rem", borderRadius: 8, border: "none", background: "rgba(16,185,129,0.2)", color: "#10B981", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
            Register partner
          </button>
          {partners.length > 0 && (
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {partners.map(p => (
                <div key={p.partner_id} style={{
                  padding: "0.65rem 0.75rem", borderRadius: 8,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.55)",
                }}>
                  <div style={{ fontWeight: 700, color: "#f0f0f0" }}>{p.company}</div>
                  <div style={{ fontFamily: MONO, fontSize: "0.58rem", marginTop: 4 }}>
                    {p.partner_id} · {p.status}
                    {p.assigned_policy_id ? ` · policy ${p.assigned_policy_id}` : ""}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    API calls: {p.usage_count ?? 0} · Consent events: {p.consent_count ?? 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: "1rem", borderRadius: 10, marginBottom: "1.25rem",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Issue new key
          </div>
          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input
              value={partnerId}
              onChange={e => setPartnerId(e.target.value)}
              placeholder="partner_id (e.g. cielo_checkout)"
              style={{
                padding: "0.55rem 0.75rem", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
                color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem", width: "100%", boxSizing: "border-box",
              }}
            />
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name (e.g. Cielo booking gate)"
              style={{
                padding: "0.55rem 0.75rem", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
                color: "#f0f0f0", fontFamily: FONT, fontSize: "0.78rem", width: "100%", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {(["live", "test"] as const).map(env => (
              <button key={env} type="button" onClick={() => setKeyEnvironment(env)}
                style={{
                  padding: "0.4rem 0.75rem", borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${keyEnvironment === env ? "#10B981" : "rgba(255,255,255,0.12)"}`,
                  background: keyEnvironment === env ? "rgba(16,185,129,0.15)" : "transparent",
                  color: keyEnvironment === env ? "#10B981" : "rgba(255,255,255,0.45)",
                  fontFamily: MONO, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
                }}>
                abx_{env}_
              </button>
            ))}
          </div>
          <button
            onClick={() => void createKey()}
            disabled={loading}
            style={{
              padding: "0.55rem 1rem", borderRadius: 8, border: "none",
              background: "#10B981", color: "#000", fontFamily: FONT, fontSize: "0.78rem",
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Generate API key
          </button>
        </div>

        {newKey && (
          <div style={{
            padding: "0.85rem 1rem", borderRadius: 8, marginBottom: "1rem",
            background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)",
            fontFamily: MONO, fontSize: "0.72rem", color: "#10B981", wordBreak: "break-all",
          }}>
            New key (copy now): {newKey}
          </div>
        )}

        {error && (
          <div style={{
            padding: "0.65rem 0.85rem", borderRadius: 8, marginBottom: "1rem",
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            fontFamily: FONT, fontSize: "0.75rem", color: "#FCA5A5",
          }}>
            {error}
          </div>
        )}

        {keys.length === 0 && !loading ? (
          <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>
            No partner keys yet. Run migration 024 in Supabase first.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {keys.map(row => (
              <div key={row.id} style={{
                padding: "1rem", borderRadius: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                opacity: row.revoked_at ? 0.55 : 1,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700 }}>{row.display_name}</div>
                    <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                      {row.partner_id} · {row.key_prefix}…
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
                      Scopes: {row.scopes.join(", ")}
                      {row.last_used_at ? ` · Last used ${new Date(row.last_used_at).toLocaleString()}` : " · Never used"}
                    </div>
                    {row.revoked_at && (
                      <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "#FCA5A5", marginTop: 4 }}>
                        Revoked {new Date(row.revoked_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {!row.revoked_at && (
                    <button
                      onClick={() => void revokeKey(row.id)}
                      disabled={actionId === row.id}
                      style={{
                        padding: "0.45rem 0.85rem", borderRadius: 6,
                        border: "1px solid rgba(239,68,68,0.4)", background: "transparent",
                        color: "#FCA5A5", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
