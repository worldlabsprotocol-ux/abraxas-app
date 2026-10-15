"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtocolVisualShell } from "./ProtocolVisualShell";
import { ProtocolDiagramFigure } from "./ProtocolDiagramFigure";

type CustodyPayload = {
  liveControlsEnabled?: boolean;
  gate?: { ok?: boolean; blockers?: string[] };
  custody?: {
    envConfigured?: boolean;
    preflight?: { ok?: boolean };
    protocolUpgradeMultisig?: { address?: string | null; derivedVaultPda?: string | null };
    registryAdministrationMultisig?: { address?: string | null; derivedVaultPda?: string | null };
  };
};

type PlaneRow = {
  id: string;
  title: string;
  scope: string;
  status: "inactive" | "observed" | "blocked";
  detail: string;
};

function buildRows(data: CustodyPayload | null, loading: boolean, error: string): PlaneRow[] {
  if (loading) {
    return [
      { id: "upgrade", title: "Program upgrade authority", scope: "BPF loader upgrades", status: "inactive", detail: "Loading custody observation…" },
      { id: "registry", title: "Registry governance", scope: "In-program admin transfers", status: "inactive", detail: "Loading custody observation…" },
      { id: "ops", title: "Operational publisher / revoker", scope: "Publish · revoke (sandbox ops)", status: "inactive", detail: "Loading custody observation…" },
    ];
  }
  if (error || !data) {
    return [
      { id: "upgrade", title: "Program upgrade authority", scope: "BPF loader upgrades", status: "inactive", detail: "Custody status unavailable. Controls treated as inactive." },
      { id: "registry", title: "Registry governance", scope: "In-program admin transfers", status: "inactive", detail: "Custody status unavailable. Controls treated as inactive." },
      { id: "ops", title: "Operational publisher / revoker", scope: "Publish · revoke (sandbox ops)", status: "inactive", detail: "Live operational keys not asserted from this console." },
    ];
  }

  const live = Boolean(data.liveControlsEnabled);
  const preflightOk = data.custody?.preflight?.ok === true;
  const upgradeVault = data.custody?.protocolUpgradeMultisig?.derivedVaultPda;
  const registryVault = data.custody?.registryAdministrationMultisig?.derivedVaultPda;

  const upgradeStatus: PlaneRow["status"] = live ? "observed" : upgradeVault ? "observed" : preflightOk ? "observed" : "inactive";
  const registryStatus: PlaneRow["status"] = live ? "observed" : registryVault ? "observed" : preflightOk ? "observed" : "inactive";

  return [
    {
      id: "upgrade",
      title: "Program upgrade authority",
      scope: "Isolated multisig vault (intended)",
      status: upgradeStatus,
      detail: live
        ? "Live controls enabled. On-chain execution may be available to authorized operators."
        : upgradeVault
          ? `Vault PDA observed (${upgradeVault.slice(0, 8)}…). Execution remains disabled in this console.`
          : "Institutional custody inactive. No verified upgrade vault on record.",
    },
    {
      id: "registry",
      title: "Registry governance authority",
      scope: "Separate from program upgrade",
      status: registryStatus,
      detail: live
        ? "Live registry governance path enabled for authorized operators."
        : registryVault
          ? `Admin vault observed (${registryVault.slice(0, 8)}…). Transfers require explicit activation.`
          : "Registry governance inactive until founder-authorized Squads provisioning completes.",
    },
    {
      id: "ops",
      title: "Operational publisher / revoker",
      scope: "Shared operational plane",
      status: "inactive",
      detail: live
        ? "Operational roles may sign publish/revoke, distinct from upgrade and registry vaults."
        : "Operational keys are not live-executed from this read-only console.",
    },
  ];
}

export function GovernanceControlPlanesInteractive() {
  const [data, setData] = useState<CustodyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trust/registry/custody-status", { cache: "no-store" });
      const json = (await res.json()) as CustodyPayload;
      if (!res.ok) {
        setData(json);
        setError("Custody status unavailable");
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

  const rows = buildRows(data, loading, error);
  const custodyInactive = !data?.liveControlsEnabled;

  return (
    <ProtocolVisualShell
      id="governance"
      title="Governance"
      className="abx-pv-governance abx-pv-shell--exhibit"
    >
      {custodyInactive ? (
        <p className="abx-pv-governance__banner" role="status">
          Institutional custody inactive: read-only observation. No on-chain execution from this UI.
        </p>
      ) : (
        <p className="abx-pv-governance__banner abx-pv-governance__banner--live" role="status">
          Live controls flag set. Operator paths may be enabled. Verify gate blockers before any execution.
        </p>
      )}

      <ul className="abx-pv-governance__planes">
        {rows.map((row) => (
          <li key={row.id} className={`abx-pv-governance__plane abx-pv-governance__plane--${row.status}`}>
            <div className="abx-pv-governance__plane-head">
              <strong>{row.title}</strong>
              <span className="abx-pv-governance__plane-badge">{row.status.replace("_", " ")}</span>
            </div>
            <p className="abx-pv-governance__plane-scope">{row.scope}</p>
            <p className="abx-pv-governance__plane-detail">{row.detail}</p>
          </li>
        ))}
      </ul>

      <details className="abx-pv-governance__reference">
        <summary>Design reference (not live state)</summary>
        <ProtocolDiagramFigure
          src="/protocol-visuals/control-planes-separated-authority.webp"
          alt=""
          width={1920}
          height={1080}
          decorative
        />
      </details>
    </ProtocolVisualShell>
  );
}
