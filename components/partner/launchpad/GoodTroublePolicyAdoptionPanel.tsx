"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

type Overview = {
  policy_id: string;
  pinned_version: number;
  active: { version: number; status: string } | null;
};

function safeError(status: number, code: unknown): string {
  if (status === 401 || status === 403 || status === 404) return "Your partner session cannot change this application. Sign in with its authorized sandbox credential.";
  if (status === 503 || code === "policy_schema_unavailable") return "Policy adoption is temporarily unavailable. Try again later or ask the operator to check Policy Change Control.";
  if (code === "policy_version_unknown" || code === "policy_version_draft" || code === "policy_version_deprecated" || code === "policy_version_not_yet_effective") return "This policy version is not available to adopt. Refresh the version or ask the policy owner to publish an active version.";
  if (code === "policy_version_mismatched" || status === 409) return "The policy changed while you were reviewing it. Refresh the version before trying again.";
  return "Could not load or adopt this policy. Refresh and try again.";
}

export function GoodTroublePolicyAdoptionPanel({ applicationId, onChanged }: {
  applicationId: string;
  onChanged?: () => void;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (preserveError = false) => {
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/policies`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { setOverview(null); setError(safeError(res.status, data.code)); return; }
      setOverview(data as Overview);
      if (!preserveError) setError("");
    } catch {
      setOverview(null);
      setError("Could not load policy versions. Check your connection and try again.");
    }
  }, [applicationId]);

  useEffect(() => { setOverview(null); setConfirming(false); void load(); }, [load]);

  async function adopt() {
    if (!confirming || !overview?.active || overview.active.status !== "active"
      || overview.active.version === overview.pinned_version || busy) return;
    const from = overview.pinned_version;
    const to = overview.active.version;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/launchpad/applications/${applicationId}/policies`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "adopt", version: to, expected_version: from }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(safeError(res.status, data.code));
        if (res.status === 409) await load(true);
        return;
      }
      await load();
      setNotice(`Application policy updated from v${from} to v${to}. Existing receipts keep their original version.`);
      onChanged?.();
    } catch {
      setError("Could not confirm adoption. Refresh to check the current pinned version before trying again.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const target = overview?.active?.status === "active" && overview.active.version !== overview.pinned_version
    ? overview.active.version : null;
  return <ContentCard title="Adopt a policy version">
    <p>This changes the version used by this sandbox application for future decisions. The Policy version planner below is read-only.</p>
    {overview && <p>Policy {overview.policy_id} · current pinned version: <strong>v{overview.pinned_version}</strong> · available active version: <strong>{overview.active ? `v${overview.active.version}` : "none"}</strong></p>}
    {target !== null && !confirming && <Btn size="sm" disabled={busy} onClick={() => setConfirming(true)}>Adopt v{target}</Btn>}
    {target !== null && confirming && <div role="group" aria-label="Confirm policy adoption">
      <p>Confirm adoption of v{target} for this sandbox application, currently pinned to v{overview?.pinned_version}. This does not activate Production.</p>
      <Btn size="sm" disabled={busy} onClick={() => void adopt()}>Confirm Adopt v{target}</Btn>{" "}
      <Btn size="sm" variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>Cancel</Btn>
    </div>}
    {overview && target === null && <p>No newer active version is available to adopt.</p>}
    {!overview && !error && <p>Loading policy versions…</p>}
    <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void load()}>Refresh policy version</Btn>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
  </ContentCard>;
}

