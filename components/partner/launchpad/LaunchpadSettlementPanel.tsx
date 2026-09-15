"use client";
// FILE: components/partner/launchpad/LaunchpadSettlementPanel.tsx

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface SettlementConfig {
  enabled: boolean;
  approved_recipient: string;
  minimum_amount_micro_usdc: number;
  maximum_amount_micro_usdc: number;
  authorization_lifetime_seconds: number;
  reusable_authorization: boolean;
  paused: boolean;
  settlement_contract_address: string | null;
  chain_id: number;
}

interface IntegrationDocs {
  payment_link: string;
  contract_address: string | null;
  explorer_link: string | null;
}

interface SettlementRow {
  id: string;
  status: string;
  amount_micro_usdc: number;
  transaction_hash: string | null;
  confirmed_at: string | null;
}

interface Props {
  applicationId: string;
  publicSlug: string;
}

export function LaunchpadSettlementPanel({ applicationId, publicSlug }: Props) {
  const [config, setConfig] = useState<SettlementConfig | null>(null);
  const [integration, setIntegration] = useState<IntegrationDocs | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [recipient, setRecipient] = useState("");
  const [minAmount, setMinAmount] = useState("0.01");
  const [maxAmount, setMaxAmount] = useState("10");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [configRes, activityRes] = await Promise.all([
      fetch(`/api/launchpad/applications/${applicationId}/settlement`, { credentials: "include" }),
      fetch(`/api/launchpad/applications/${applicationId}/settlement/activity`, { credentials: "include" }),
    ]);
    const configData = await configRes.json();
    const activityData = await activityRes.json();
    if (configData.config) {
      setConfig(configData.config);
      setRecipient(configData.config.approved_recipient ?? "");
      setMinAmount(String((configData.config.minimum_amount_micro_usdc ?? 10000) / 1_000_000));
      setMaxAmount(String((configData.config.maximum_amount_micro_usdc ?? 10_000_000) / 1_000_000));
    }
    if (configData.integration) setIntegration(configData.integration);
    if (activityData.settlements) setSettlements(activityData.settlements);
    setLoading(false);
  }, [applicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveConfig(enabled: boolean) {
    setMessage("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/settlement`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        enabled,
        approved_recipient: recipient,
        minimum_amount_micro_usdc: Math.round(parseFloat(minAmount) * 1_000_000),
        maximum_amount_micro_usdc: Math.round(parseFloat(maxAmount) * 1_000_000),
        authorization_lifetime_seconds: 900,
        reusable_authorization: false,
        paused: false,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? data.code ?? "Save failed");
      return;
    }
    setMessage(enabled ? "Arc Testnet settlement enabled" : "Arc Testnet settlement disabled");
    await refresh();
  }

  if (loading) {
    return <ContentCard title="Settlement">Loading Arc Testnet configuration…</ContentCard>;
  }

  const latest = settlements.find((s) => s.status === "confirmed");

  return (
    <ContentCard title="Settlement">
      <p style={bodyText}>
        Optional Arc Testnet USDC settlement after Abraxas proof authorization. TESTNET funds have no real value.
        Production Arc remains unavailable until Arc publishes mainnet parameters and Abraxas completes a separate review.
      </p>

      <div style={testnetBannerStyle}>Arc Testnet TESTNET</div>

      <label style={labelStyle}>
        Approved USDC recipient
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} style={inputStyle} placeholder="0x…" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <label style={labelStyle}>
          Minimum USDC
          <input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Maximum USDC
          <input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <Btn size="sm" onClick={() => void saveConfig(true)}>Enable Arc Testnet</Btn>
        <Btn size="sm" variant="secondary" onClick={() => void saveConfig(false)}>Disable</Btn>
      </div>

      {message && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--accent)" }}>{message}</p>}

      {config?.enabled && (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={bodyText}>
            Status: {config.paused ? "Paused" : "Active"} · Chain {config.chain_id}
          </p>
          {integration?.contract_address && (
            <p style={bodyText}>
              Contract: <code style={{ fontFamily: MONO }}>{integration.contract_address}</code>
              {integration.explorer_link && (
                <a href={integration.explorer_link} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: "var(--accent)" }}>
                  Explorer
                </a>
              )}
            </p>
          )}
          {integration?.payment_link && (
            <p style={bodyText}>
              Hosted payment link: <code style={{ fontFamily: MONO, fontSize: "0.62rem" }}>{integration.payment_link}</code>
            </p>
          )}
          <p style={bodyText}>
            Demo path: <code style={{ fontFamily: MONO }}>/developers/arc-demo?app={publicSlug}</code>
          </p>
          {latest?.transaction_hash && (
            <p style={bodyText}>Latest settlement: {latest.transaction_hash}</p>
          )}
        </div>
      )}
    </ContentCard>
  );
}

const bodyText: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: "0 0 0.75rem",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.35rem",
  fontFamily: FONT,
  fontSize: "0.72rem",
  fontWeight: 700,
  marginBottom: "0.65rem",
};

const inputStyle: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.72rem",
  padding: "0.55rem 0.65rem",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface-inset)",
  color: "var(--text-primary)",
};

const testnetBannerStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#f59e0b",
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.35)",
  borderRadius: 8,
  padding: "0.4rem 0.65rem",
  marginBottom: "0.75rem",
};
