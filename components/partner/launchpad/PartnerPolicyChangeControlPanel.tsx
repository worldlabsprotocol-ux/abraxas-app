"use client";
// FILE: components/partner/launchpad/PartnerPolicyChangeControlPanel.tsx
// Partner Launchpad Policies area. No raw credentials, PII, DOB, documents, or secrets.

import { useCallback, useEffect, useState } from "react";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

interface VersionSurface {
  version: number;
  status: string;
  name: string;
  required_claims: string[];
  assurance_level: string | null;
  purpose: string[];
  result_fields: string[];
  withheld_fields: string[];
}

interface Overview {
  policy_id: string;
  pinned_version: number;
  active: VersionSurface | null;
  draft: VersionSurface | null;
  comparison: {
    compatibility: string;
    added_claims: string[];
    removed_claims: string[];
    raised_assurance: boolean;
    blocker_code: string | null;
  } | null;
  applications: Array<{
    application_id: string;
    public_slug: string;
    display_name: string;
    pinned_version: number;
    compatibility: string;
    health: { status: string; next_action: string; blocker_code: string | null };
  }>;
  next_action: string;
  blocker_code: string | null;
  fixture_label: string;
  google_sign_in_is_not_eligibility: string;
  audit: Array<{ id: string; event_type: string; version: number; created_at: string; safe_code: string | null }>;
}

interface FixtureResult {
  classification: string;
  label: string;
  decision: string;
  reason_codes: string[];
  missing_claims: string[];
  production_usable: boolean;
  issues_receipt: boolean;
}

export function PartnerPolicyChangeControlPanel({
  applicationId,
  onChanged,
}: {
  applicationId: string;
  onChanged?: () => void;
}) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [fixture, setFixture] = useState<FixtureResult | null>(null);
  const [deprecateAt, setDeprecateAt] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/launchpad/applications/${applicationId}/policies`, { credentials: "include" });
    const data = await res.json();
    if (res.ok) setOverview(data as Overview);
    else setError(String(data.error ?? data.code ?? "Could not load policies"));
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fetch(`/api/launchpad/applications/${applicationId}/policies`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(String(data.code ?? data.error ?? "Policy action failed"));
      return;
    }
    if (action === "fixture") {
      setFixture(data as FixtureResult);
      setNotice(String(data.label ?? "Offline / simulated"));
      return;
    }
    setNotice(String(data.notice ?? `${action.replace(/_/g, " ")} completed.`));
    await load();
    onChanged?.();
  }

  if (!overview) {
    return (
      <ContentCard title="Policies">
        <p style={bodyText}>Loading policy versions…</p>
        {error && <p style={{ ...bodyText, color: "#ef4444" }}>{error}</p>}
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Policies">
      <p style={bodyText}>
        Receipts stay bound to the policy version that issued them. Newer versions are not used until this integration explicitly adopts them. Google sign-in is account-only and never proves eligibility.
      </p>
      <p style={bodyText}>
        Policy <code style={{ fontFamily: MONO }}>{overview.policy_id}</code>
        {" · pinned "}
        <code style={{ fontFamily: MONO }}>v{overview.pinned_version}</code>
      </p>

      <div style={grid}>
        <div style={box}>
          <strong style={label}>Current active version</strong>
          {overview.active ? <VersionBlock surface={overview.active} /> : <p style={bodyText}>No active published version.</p>}
        </div>
        <div style={box}>
          <strong style={label}>Draft successor</strong>
          {overview.draft ? <VersionBlock surface={overview.draft} /> : <p style={bodyText}>No draft. Create one from the active version to propose changes.</p>}
        </div>
      </div>

      {overview.comparison && (
        <div style={{ ...box, marginBottom: "0.75rem" }}>
          <strong style={label}>Comparison</strong>
          <p style={bodyText}>
            Compatibility: {overview.comparison.compatibility}
            {overview.comparison.blocker_code ? ` · ${overview.comparison.blocker_code}` : ""}
          </p>
          <p style={bodyText}>Added claims: {overview.comparison.added_claims.join(", ") || "none"}</p>
          <p style={bodyText}>Removed claims: {overview.comparison.removed_claims.join(", ") || "none"}</p>
          <p style={bodyText}>Assurance raised: {overview.comparison.raised_assurance ? "yes" : "no"}</p>
        </div>
      )}

      <div style={{ ...box, marginBottom: "0.75rem" }}>
        <strong style={label}>Safe next action</strong>
        <p style={bodyText}>{overview.next_action}</p>
        {overview.blocker_code && <p style={bodyText}>Blocker: <code style={{ fontFamily: MONO }}>{overview.blocker_code}</code></p>}
      </div>

      <div style={{ ...box, marginBottom: "0.75rem" }}>
        <strong style={label}>Integration compatibility</strong>
        {overview.applications.map((app) => (
          <p key={app.application_id} style={bodyText}>
            {app.display_name} ({app.public_slug}) pinned v{app.pinned_version} · {app.compatibility} · {app.health.status}
            {app.health.blocker_code ? ` · ${app.health.blocker_code}` : ""}
          </p>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <Btn size="sm" disabled={busy} onClick={() => void run("create_draft")}>Create draft successor</Btn>
        {overview.draft && (
          <>
            <Btn size="sm" disabled={busy} onClick={() => void run("publish", { version: overview.draft!.version })}>Publish draft</Btn>
            <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void run("delete_draft", { version: overview.draft!.version })}>Discard draft</Btn>
            <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void run("fixture", {
              version: overview.draft!.version,
              fixture_claims: overview.draft!.required_claims.map((claim) => ({ claim_type: claim, present: true, assurance_level: "L2" })),
            })}>Run offline fixture test</Btn>
          </>
        )}
        {overview.active && overview.active.version !== overview.pinned_version && (
          <Btn size="sm" disabled={busy} onClick={() => void run("adopt", { version: overview.active!.version })}>
            Adopt v{overview.active.version}
          </Btn>
        )}
      </div>

      {overview.active && (
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={fieldLabel}>
            Optional deprecation effective date (ISO)
            <input value={deprecateAt} onChange={(e) => setDeprecateAt(e.target.value)} placeholder="2026-12-01T00:00:00.000Z" style={inputStyle} />
          </label>
          <Btn size="sm" variant="secondary" disabled={busy} onClick={() => void run("deprecate", {
            version: overview.active!.version,
            deprecate_effective_at: deprecateAt || null,
          })}>Schedule or deprecate active version</Btn>
        </div>
      )}

      <div style={{ ...box, marginBottom: "0.75rem", borderColor: "#f59e0b" }}>
        <strong style={label}>Fixture test panel — offline / simulated</strong>
        <p style={bodyText}>{overview.fixture_label}</p>
        {fixture && (
          <pre style={codeBlock}>{JSON.stringify({
            classification: fixture.classification,
            decision: fixture.decision,
            reason_codes: fixture.reason_codes,
            missing_claims: fixture.missing_claims,
            production_usable: fixture.production_usable,
            issues_receipt: fixture.issues_receipt,
          }, null, 2)}</pre>
        )}
      </div>

      {overview.audit.length > 0 && (
        <div style={box}>
          <strong style={label}>Lifecycle audit</strong>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            {overview.audit.slice(0, 8).map((event) => (
              <li key={event.id}>
                {event.event_type.replace(/_/g, " ")} · v{event.version}
                {event.safe_code ? ` · ${event.safe_code}` : ""} · {new Date(event.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ ...bodyText, marginTop: "0.75rem" }}>{overview.google_sign_in_is_not_eligibility}</p>
      {notice && <p style={{ ...bodyText, color: "#10B981" }}>{notice}</p>}
      {error && <p style={{ ...bodyText, color: "#ef4444" }}>{error}</p>}
    </ContentCard>
  );
}

function VersionBlock({ surface }: { surface: VersionSurface }) {
  return (
    <>
      <p style={bodyText}><code style={{ fontFamily: MONO }}>v{surface.version}</code> · {surface.status} · {surface.name}</p>
      <p style={bodyText}>Required claims: {surface.required_claims.join(", ") || "none"}</p>
      <p style={bodyText}>Assurance: {surface.assurance_level ?? "unspecified"}</p>
      <p style={bodyText}>Purpose: {surface.purpose.join(", ") || "partner eligibility"}</p>
      <p style={bodyText}>Result fields: {surface.result_fields.join(", ") || "decision only"}</p>
      <p style={bodyText}>Withheld: {surface.withheld_fields.join(", ")}</p>
    </>
  );
}

const bodyText: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  margin: "0 0 0.45rem",
};

const label: React.CSSProperties = {
  display: "block",
  fontFamily: FONT,
  fontSize: "0.74rem",
  marginBottom: "0.35rem",
};

const fieldLabel: React.CSSProperties = {
  display: "grid",
  gap: "0.35rem",
  fontFamily: FONT,
  fontSize: "0.72rem",
  fontWeight: 700,
  marginBottom: "0.45rem",
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

const box: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "0.65rem",
};

const grid: React.CSSProperties = {
  display: "grid",
  gap: "0.65rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  marginBottom: "0.75rem",
};

const codeBlock: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.62rem",
  lineHeight: 1.55,
  padding: "0.85rem",
  borderRadius: 10,
  overflow: "auto",
  background: "var(--surface-inset)",
  border: "1px solid var(--border)",
};
