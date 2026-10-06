"use client";
// FILE: components/partner/launchpad/PartnerBindingProductionPanel.tsx
// Per-binding production authorization status in the Launchpad production workspace.

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface BindingProductionRow {
  binding_id: string;
  title: string;
  pack_id: string;
  production_status: string;
  application_production_authorized: boolean;
  production_next_action: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  sandbox_only: "Sandbox only",
  production_requested: "Under review",
  production_under_review: "Under review",
  production_approved: "Approved",
  production_active: "Production active",
  production_rejected: "Rejected",
  production_suspended: "Suspended",
};

export function PartnerBindingProductionPanel({ applicationId }: { applicationId: string }) {
  const [bindings, setBindings] = useState<BindingProductionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/binding-production`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json() as { bindings?: BindingProductionRow[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not load binding production status");
      setBindings([]);
    } else {
      setBindings(data.bindings ?? []);
    }
    setLoading(false);
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  async function requestProduction(bindingId: string) {
    setRequesting(bindingId);
    setError("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/binding-production`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ binding_id: bindingId }),
    });
    const data = await res.json() as { error?: string; code?: string };
    if (!res.ok) {
      setError(data.code ?? data.error ?? "Could not request binding production");
    } else {
      await load();
    }
    setRequesting(null);
  }

  if (loading) {
    return (
      <ContentCard title="Production policies">
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: 0 }}>Loading policy bindings…</p>
      </ContentCard>
    );
  }

  if (bindings.length <= 1) return null;

  return (
    <ContentCard title="Production policies">
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: "0 0 0.75rem" }}>
        Application production access is shared. Each policy binding requires its own operator review before production use.
      </p>
      {error && <p role="alert" style={{ color: "#ef4444", fontFamily: FONT, fontSize: "0.72rem", margin: "0 0 0.65rem" }}>{error}</p>}
      <div style={{ display: "grid", gap: "0.55rem" }}>
        {bindings.map((binding) => (
          <div key={binding.binding_id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700 }}>{binding.title}</span>
              <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-muted)" }}>{binding.pack_id}</span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0.35rem 0 0" }}>
              Sandbox: Active · Production: {STATUS_LABEL[binding.production_status] ?? binding.production_status}
              {binding.production_next_action === "request_binding_production" && (
                <>
                  {" · "}
                  <Btn
                    size="sm"
                    variant="secondary"
                    loading={requesting === binding.binding_id}
                    disabled={Boolean(requesting)}
                    onClick={() => void requestProduction(binding.binding_id)}
                  >
                    Request production
                  </Btn>
                </>
              )}
            </p>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}
