"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

type CustodyStatusResponse = {
  schema?: string;
  liveControlsEnabled?: boolean;
  error?: string;
  detail?: string;
  gate?: {
    activationReady?: boolean;
    blockedReasons?: string[];
    domains?: Record<string, { status?: string; detail?: string }>;
  };
  custody?: {
    envConfigured?: boolean;
    preflight?: { ok?: boolean; findings?: string[] };
    protocolUpgradeMultisig?: { address?: string; derivedVaultPda?: string | null };
    registryAdministrationMultisig?: { address?: string; derivedVaultPda?: string | null };
  };
  runbook?: { title?: string; steps?: string[] };
};

export function InstitutionalGovernanceConsole() {
  const [data, setData] = useState<CustodyStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trust/registry/custody-status", { cache: "no-store" });
      const json = (await res.json()) as CustodyStatusResponse;
      if (!res.ok) {
        setData(json);
        setError(json.detail ?? json.error ?? "Custody status unavailable");
        return;
      }
      setData(json);
    } catch {
      setError("Custody status unavailable");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="abx-governance-console">
      <ContentCard title="Institutional governance · read-only">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
          Sources Solana devnet observation and documented Squads custody preflight. Live on-chain controls are disabled in this console — no simulated approvals.
        </p>
        {loading && <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>Loading custody and governance state…</p>}
        {error && !loading && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--danger, #f87171)" }} role="alert">
            {error}
          </p>
        )}
        {data?.liveControlsEnabled === false && (
          <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0.5rem 0" }}>
            liveControlsEnabled: false
          </p>
        )}
      </ContentCard>

      {data?.gate && (
        <ContentCard title="Activation gate">
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0 0 0.5rem" }}>
            Migration readiness: {data.gate.activationReady ? "ready (preflight)" : "blocked or incomplete"}
          </p>
          {data.gate.blockedReasons?.length ? (
            <ul style={{ fontFamily: FONT, fontSize: "0.72rem", paddingLeft: "1.1rem", margin: 0 }}>
              {data.gate.blockedReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>No blocked reasons returned.</p>
          )}
          {data.gate.domains && (
            <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.75rem" }}>
              {Object.entries(data.gate.domains).map(([key, domain]) => (
                <div key={key} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.55rem 0.65rem" }}>
                  <strong style={{ fontFamily: FONT, fontSize: "0.72rem" }}>{key.replace(/_/g, " ")}</strong>
                  <p style={{ fontFamily: FONT, fontSize: "0.68rem", margin: "0.25rem 0 0", color: "var(--text-secondary)" }}>
                    {domain.status ?? "unknown"}
                    {domain.detail ? ` — ${domain.detail}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ContentCard>
      )}

      {data?.custody && (
        <ContentCard title="Squads custody configuration">
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: "0 0 0.5rem" }}>
            Environment documented: {data.custody.envConfigured ? "yes" : "not configured"}
          </p>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div>
              <p style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, margin: 0 }}>Program upgrade authority multisig</p>
              <p style={{ fontFamily: MONO, fontSize: "0.62rem", margin: "0.2rem 0 0", wordBreak: "break-all" }}>
                {data.custody.protocolUpgradeMultisig?.address ?? "unconfigured"}
              </p>
              <p style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                Vault PDA: {data.custody.protocolUpgradeMultisig?.derivedVaultPda ?? "—"}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, margin: 0 }}>Registry administration multisig</p>
              <p style={{ fontFamily: MONO, fontSize: "0.62rem", margin: "0.2rem 0 0", wordBreak: "break-all" }}>
                {data.custody.registryAdministrationMultisig?.address ?? "unconfigured"}
              </p>
              <p style={{ fontFamily: MONO, fontSize: "0.6rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                Vault PDA: {data.custody.registryAdministrationMultisig?.derivedVaultPda ?? "—"}
              </p>
            </div>
          </div>
          {data.custody.preflight?.findings?.length ? (
            <ul style={{ fontFamily: FONT, fontSize: "0.68rem", paddingLeft: "1rem", marginTop: "0.65rem" }}>
              {data.custody.preflight.findings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          ) : null}
        </ContentCard>
      )}

      {data?.runbook?.steps?.length ? (
        <ContentCard title={data.runbook.title ?? "Provisioning runbook"}>
          <ol style={{ fontFamily: FONT, fontSize: "0.72rem", paddingLeft: "1.1rem", margin: 0, display: "grid", gap: "0.35rem" }}>
            {data.runbook.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </ContentCard>
      ) : null}
    </div>
  );
}
