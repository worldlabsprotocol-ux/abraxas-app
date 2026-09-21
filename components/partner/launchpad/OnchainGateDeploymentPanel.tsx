"use client";
// FILE: components/partner/launchpad/OnchainGateDeploymentPanel.tsx
// Partner-owned gate registry. Never deploys or funds a contract.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: 0,
};

export function OnchainGateDeploymentPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const [safeStatus, setSafeStatus] = useState("no_deployment_registered");
  const [signerHint, setSignerHint] = useState("");
  const [error, setError] = useState("");
  const [manifestText, setManifestText] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/onchain-gate-deployments`, {
        credentials: "include",
      });
      const data = await res.json() as { safe_status?: string; error?: string; signer_updates?: Array<{ status?: string }> };
      if (!res.ok) {
        setError("Could not load gate deployments.");
        return;
      }
      setSafeStatus(data.safe_status ?? "unavailable");
      const update = data.signer_updates?.find((row) => row.status === "signer_update_required" || row.status === "signer_revoked");
      setSignerHint(update?.status ? `Signer package: ${update.status.replace(/_/g, " ")}. Apply the owner instruction on your gate. Abraxas does not send the transaction.` : "");
    } catch {
      setError("Could not load gate deployments.");
    }
  }, [applicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const manifest = JSON.parse(manifestText) as unknown;
      const res = await fetch(`/api/launchpad/applications/${applicationId}/onchain-gate-deployments`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manifest }),
      });
      const data = await res.json() as { ok?: boolean; reason?: string };
      if (!data.ok) setError(data.reason ?? "Verification did not accept this manifest.");
      await refresh();
    } catch {
      setError("Manifest must be exact JSON with the documented fields only.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ContentCard title="Onchain gate deployment">
      <p style={{ ...body, marginBottom: "0.75rem" }}>
        You deploy the gate. Abraxas verifies the registered configuration and issues chain
        attestations only for that exact deployment. This step never deploys, upgrades, calls, or funds a contract.
      </p>
      <p style={{ ...body, fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.65rem" }} role="status">
        Status: {safeStatus.replace(/_/g, " ")}
      </p>
      {signerHint ? <p style={{ ...body, marginBottom: "0.65rem" }}>{signerHint}</p> : null}
      {error && <p role="alert" style={{ ...body, color: "var(--danger, #f87171)", marginBottom: "0.7rem" }}>{error}</p>}
      <textarea
        aria-label="Deployment manifest JSON"
        value={manifestText}
        onChange={(event) => setManifestText(event.target.value)}
        rows={10}
        style={{
          width: "100%",
          fontFamily: MONO,
          fontSize: "0.72rem",
          borderRadius: 10,
          border: "1px solid var(--border)",
          padding: "0.7rem",
          background: "var(--surface-inset)",
          color: "var(--text-primary)",
          marginBottom: "0.65rem",
        }}
      />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <Btn size="sm" disabled={busy} onClick={() => void submit()}>Verify registered deployment</Btn>
        <Link href="/docs/onchain-gate-deployments" style={{ fontFamily: FONT, fontSize: "0.78rem" }}>
          Registration docs
        </Link>
        <Link href="/docs/chain-attestation-signer-lifecycle" style={{ fontFamily: FONT, fontSize: "0.78rem" }}>
          Signer lifecycle
        </Link>
      </div>
    </ContentCard>
  );
}
