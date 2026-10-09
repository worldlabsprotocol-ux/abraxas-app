"use client";
// FILE: components/partner/launchpad/PartnerBindingSelector.tsx

import { useCallback, useEffect, useState } from "react";
import { EligibilityPolicyCard } from "@/components/product/EligibilityPolicyCard";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

interface BindingSummary {
  binding_id: string | null;
  title: string;
  question: string;
  partner_receives: string;
  partner_does_not_receive: string[];
  pack_id: string;
  policy_id: string;
  policy_version: number;
  disclosed_result: string;
  application_production_authorized: boolean;
  application_environment: "sandbox" | "production";
  availability: string;
}

interface PoliciesResponse {
  summary: {
    bindings: BindingSummary[];
    configured_count: number;
  };
}

export function PartnerBindingSelector({
  applicationId,
  selectedBindingId,
  onSelect,
  onBindingsLoaded,
  label = "Integration policy",
}: {
  applicationId: string;
  selectedBindingId: string | null;
  onSelect: (bindingId: string) => void;
  onBindingsLoaded?: (bindings: BindingSummary[]) => void;
  label?: string;
}) {
  const [bindings, setBindings] = useState<BindingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/launchpad/applications/${applicationId}/eligibility-policies`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json() as PoliciesResponse;
    if (res.ok) {
      setBindings(data.summary.bindings);
      onBindingsLoaded?.(data.summary.bindings);
      if (!selectedBindingId && data.summary.bindings.length === 1 && data.summary.bindings[0]?.binding_id) {
        onSelect(data.summary.bindings[0].binding_id);
      }
    }
    setLoading(false);
  }, [applicationId, onBindingsLoaded, onSelect, selectedBindingId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)" }}>Loading policies…</p>;
  }

  if (bindings.length === 0) {
    return <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)" }}>No configured bindings.</p>;
  }

  return (
    <div>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, margin: "0 0 0.55rem" }}>{label}</p>
      <div style={{ display: "grid", gap: "0.55rem" }}>
        {bindings.map((binding) => (
          <EligibilityPolicyCard
            key={binding.binding_id ?? binding.policy_id}
            title={binding.title}
            question={binding.question}
            partnerReceives={binding.partner_receives}
            partnerDoesNotReceive={binding.partner_does_not_receive}
            packId={String(binding.pack_id)}
            catalogVersion={binding.policy_version}
            resultFamily={binding.disclosed_result}
            environment={binding.application_production_authorized ? "production" : "sandbox"}
            selected={selectedBindingId === binding.binding_id}
            onSelect={binding.binding_id ? () => onSelect(binding.binding_id!) : undefined}
            compact
          />
        ))}
      </div>
      {bindings.length > 1 && !selectedBindingId && (
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "#f59e0b", margin: "0.55rem 0 0" }}>
          Select which eligibility policy this integration uses.
        </p>
      )}
    </div>
  );
}
