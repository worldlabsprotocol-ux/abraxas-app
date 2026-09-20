"use client";
// FILE: components/partner/launchpad/NetworkReadinessPanel.tsx
// Read-only network readiness. Never activates Mainnet.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import type { NetworkReadinessView } from "@/lib/partner/networkCapability/profile";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

export function NetworkReadinessPanel({
  applicationId,
  onContinue,
}: {
  applicationId: string;
  onContinue?: () => void;
}) {
  const [view, setView] = useState<NetworkReadinessView | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/network-readiness`, {
        credentials: "include",
      });
      const data = await res.json() as NetworkReadinessView & { error?: string };
      if (!res.ok) {
        setError("Could not load network readiness.");
        setView(null);
        return;
      }
      setView(data);
    } catch {
      setError("Could not load network readiness.");
    }
  }, [applicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <ContentCard title="Network readiness">
      <p style={{ ...body, marginBottom: "0.75rem" }}>
        Abraxas verifies and preflights. Partners run their own chain or venue execution. This step
        does not activate Mainnet, issue keys, or move funds.
      </p>
      {error && <p role="alert" style={{ ...body, color: "var(--danger, #f87171)", marginBottom: "0.7rem" }}>{error}</p>}
      {view && (
        <>
          <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)" }} role="status">
            App environment: {view.app_environment}. Production access reviewed: {view.production_access_approved ? "yes" : "no"}.
          </p>
          <p style={{ ...body, marginBottom: "0.65rem" }}>
            Selected capabilities: {view.selected_capabilities.join(", ")}
          </p>
          <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.85rem" }}>
            {view.networks.map((network) => (
              <div key={network.network_id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem" }}>
                <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700 }}>{network.display_label}</div>
                <p style={body}>Status: {network.status.replace(/_/g, " ")} · {network.environment}</p>
                <p style={body}>{network.eligible_for_this_app ? "Eligible for sandbox/test preflight only." : network.why_unavailable}</p>
                <p style={body}>Abraxas executes: never</p>
              </div>
            ))}
          </div>
          <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
            Before a reviewed Mainnet request
          </h3>
          <ul style={{ ...body, paddingLeft: "1.1rem", marginBottom: "0.75rem" }}>
            {view.before_mainnet_request.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p style={{ ...body, marginBottom: "0.7rem" }}>{view.google_is_account_only}</p>
          <p style={{ ...body, marginBottom: "0.7rem" }}>
            <Link href="/docs/multichain-mainnet-readiness" style={{ color: "var(--accent)", fontWeight: 700 }}>
              Multi-chain Mainnet readiness
            </Link>
            {" · "}
            <Link href={view.review_href} style={{ color: "var(--accent)", fontWeight: 700 }}>
              Request Production review
            </Link>
          </p>
          {onContinue && (
            <Btn size="sm" variant="secondary" onClick={onContinue}>Continue to test console</Btn>
          )}
        </>
      )}
    </ContentCard>
  );
}
