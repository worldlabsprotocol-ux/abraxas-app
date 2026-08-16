"use client";
// FILE: components/admin/AdminPartnerKeysPanel.tsx
// Partner API key issuance (existing admin flow).

import { useCallback, useEffect, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { useAdminConfirm } from "@/lib/admin/useAdminConfirm";

const MONO = "'JetBrains Mono',monospace";
const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

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

export function AdminPartnerKeysPanel({ pin }: { pin: string }) {
  const [keys, setKeys] = useState<PartnerKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [keyEnvironment, setKeyEnvironment] = useState<"live" | "test">("live");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const { requestConfirm, confirmDialogProps } = useAdminConfirm();

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partner-keys", {
        headers: pin ? { "x-admin-pin": pin } : undefined,
        credentials: "include",
      });
      const data = await res.json() as { keys?: PartnerKeyRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load keys");
      setKeys(data.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [pin]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function executeCreateKey() {
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
        headers: {
          "Content-Type": "application/json",
          ...(pin ? { "x-admin-pin": pin } : {}),
        },
        credentials: "include",
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

  function promptCreateKey() {
    if (!partnerId.trim() || !displayName.trim()) {
      setError("Partner ID and display name required.");
      return;
    }
    requestConfirm({
      actionKey: "partner_key.issue",
      context: {
        partnerId: partnerId.trim(),
        keyEnvironment,
      },
      onConfirmed: () => executeCreateKey(),
    });
  }

  async function executeRevokeKey(id: string) {
    setActionId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/partner-keys", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(pin ? { "x-admin-pin": pin } : {}),
        },
        credentials: "include",
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

  function promptRevokeKey(row: PartnerKeyRow) {
    requestConfirm({
      actionKey: "partner_key.revoke",
      context: {
        keyPrefix: row.key_prefix,
        partnerId: row.partner_id,
      },
      onConfirmed: () => executeRevokeKey(row.id),
    });
  }

  return (
    <div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "1rem" }}>
        Issue keys for server-side verify APIs. Keys are shown once at creation — never stored in full in this UI after refresh.
      </p>

      <button type="button" onClick={() => void loadKeys()} disabled={loading}
        style={{ marginBottom: "1rem", padding: "0.55rem 1rem", borderRadius: 8, border: "none", background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
        {loading ? "Loading…" : "Refresh keys"}
      </button>

      <div style={{ padding: "1rem", borderRadius: 10, marginBottom: "1.25rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.65rem", textTransform: "uppercase" }}>
          Issue new key
        </div>
        <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <input value={partnerId} onChange={e => setPartnerId(e.target.value)} placeholder="partner_id"
            style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: MONO, fontSize: "0.72rem" }} />
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name"
            style={{ padding: "0.55rem 0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#f0f0f0", fontFamily: FONT, fontSize: "0.78rem" }} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {(["live", "test"] as const).map(env => (
            <button key={env} type="button" onClick={() => setKeyEnvironment(env)}
              style={{
                padding: "0.4rem 0.75rem", borderRadius: 6, cursor: "pointer",
                border: `1px solid ${keyEnvironment === env ? ACCENT : "rgba(255,255,255,0.12)"}`,
                background: keyEnvironment === env ? "rgba(16,185,129,0.15)" : "transparent",
                color: keyEnvironment === env ? ACCENT : "rgba(255,255,255,0.45)",
                fontFamily: MONO, fontSize: "0.65rem", fontWeight: 700,
              }}>
              abx_{env}_
            </button>
          ))}
        </div>
        <button type="button" onClick={() => promptCreateKey()} disabled={loading || confirmDialogProps.busy}
          style={{ padding: "0.55rem 1rem", borderRadius: 8, border: "none", background: ACCENT, color: "#000", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
          Generate API key
        </button>
      </div>

      {newKey && (
        <div style={{ padding: "0.85rem 1rem", borderRadius: 8, marginBottom: "1rem", background: "rgba(16,185,129,0.12)", border: `1px solid ${ACCENT}55`, fontFamily: MONO, fontSize: "0.72rem", color: ACCENT, wordBreak: "break-all" }}>
          New key (copy now): {newKey}
        </div>
      )}

      {error && (
        <div style={{ padding: "0.65rem 0.85rem", borderRadius: 8, marginBottom: "1rem", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", fontFamily: FONT, fontSize: "0.75rem", color: "#FCA5A5" }}>
          {error}
        </div>
      )}

      {keys.length === 0 && !loading ? (
        <div style={{ fontFamily: FONT, fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>No partner keys yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {keys.map(row => (
            <div key={row.id} style={{ padding: "1rem", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", opacity: row.revoked_at ? 0.55 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700 }}>{row.display_name}</div>
                  <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                    {row.partner_id} · {row.key_prefix}…
                  </div>
                </div>
                {!row.revoked_at && (
                  <button type="button" onClick={() => promptRevokeKey(row)} disabled={actionId === row.id || confirmDialogProps.busy}
                    style={{ padding: "0.45rem 0.85rem", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#FCA5A5", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <AdminConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
