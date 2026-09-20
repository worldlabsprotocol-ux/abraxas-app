"use client";
// FILE: components/partner/policyProposal/PolicyProposalForm.tsx

import { useMemo, useState } from "react";
import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  POLICY_PROPOSAL_ACTION_LABELS,
  POLICY_PROPOSAL_ACTIONS,
  POLICY_PROPOSAL_CAPABILITIES,
  POLICY_PROPOSAL_CAPABILITY_LABELS,
  POLICY_PROPOSAL_ENVIRONMENT_LABELS,
  POLICY_PROPOSAL_ENVIRONMENTS,
  POLICY_PROPOSAL_NOTICE,
  POLICY_PROPOSAL_PLATFORM_LABELS,
  POLICY_PROPOSAL_PLATFORMS,
  POLICY_PROPOSAL_PRIVATE,
  POLICY_PROPOSAL_PRIVATE_LABELS,
  POLICY_PROPOSAL_RECEIVE_LABELS,
  POLICY_PROPOSAL_RECEIVES,
  POLICY_PROPOSAL_RESULT_LABELS,
  POLICY_PROPOSAL_RESULTS,
} from "@/lib/partner/policyProposal/contract";

const FONT = ABRAXAS_FONT_SANS;

function Chip({
  pressed,
  label,
  onClick,
}: {
  pressed: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={{
        padding: "0.45rem 0.7rem",
        borderRadius: 999,
        border: pressed ? "1px solid #2DD4BF" : "1px solid rgba(255,255,255,0.16)",
        background: pressed ? "rgba(45,212,191,0.16)" : "transparent",
        color: "var(--text-primary)",
        fontFamily: FONT,
        fontSize: "0.78rem",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function PolicyProposalForm({ initialAction, initialResult }: { initialAction?: string; initialResult?: string }) {
  const [action, setAction] = useState(initialAction && initialAction in POLICY_PROPOSAL_ACTION_LABELS ? initialAction : "retail_access");
  const [result, setResult] = useState(initialResult && initialResult in POLICY_PROPOSAL_RESULT_LABELS ? initialResult : "age_21");
  const [receives, setReceives] = useState<string[]>(["eligibility_result"]);
  const [privacy, setPrivacy] = useState<string[]>(["date_of_birth", "raw_documents"]);
  const [environment, setEnvironment] = useState("sandbox");
  const [platform, setPlatform] = useState("http_generic");
  const [capabilities, setCapabilities] = useState<string[]>(["reusable_result"]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const body = useMemo(() => ({
    action,
    result_needed: result,
    partner_receives: receives,
    stays_private: privacy,
    environment,
    platform,
    capabilities,
    confirm: true,
  }), [action, result, receives, privacy, environment, platform, capabilities]);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function submit() {
    setError("");
    setStatus("");
    const res = await fetch("/api/launchpad/policy-proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json() as { error?: string; code?: string; proposal_ref?: string; status_label?: string };
    if (!res.ok) {
      setError(json.error ?? json.code ?? (res.status === 401 ? "Sign in to Launchpad to submit." : "Could not submit"));
      return;
    }
    setStatus(`Submitted ${json.proposal_ref}. ${json.status_label}. ${POLICY_PROPOSAL_NOTICE}`);
  }

  return (
    <form
      role="form"
      aria-labelledby="policy-proposal-heading"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      style={{ display: "grid", gap: "0.85rem", textAlign: "left" }}
    >
      <h3 id="policy-proposal-heading" style={{ fontFamily: FONT, fontSize: "1rem", margin: 0 }}>
        Tell us the gate your product needs
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>{POLICY_PROPOSAL_NOTICE}</p>
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>Product action</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {POLICY_PROPOSAL_ACTIONS.map((id) => (
            <Chip key={id} pressed={action === id} label={POLICY_PROPOSAL_ACTION_LABELS[id]} onClick={() => setAction(id)} />
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>Result needed</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {POLICY_PROPOSAL_RESULTS.map((id) => (
            <Chip key={id} pressed={result === id} label={POLICY_PROPOSAL_RESULT_LABELS[id]} onClick={() => setResult(id)} />
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>What the partner receives</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {POLICY_PROPOSAL_RECEIVES.map((id) => (
            <Chip key={id} pressed={receives.includes(id)} label={POLICY_PROPOSAL_RECEIVE_LABELS[id]} onClick={() => toggle(receives, id, setReceives)} />
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>What stays private</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {POLICY_PROPOSAL_PRIVATE.map((id) => (
            <Chip key={id} pressed={privacy.includes(id)} label={POLICY_PROPOSAL_PRIVATE_LABELS[id]} onClick={() => toggle(privacy, id, setPrivacy)} />
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>Sandbox versus future Production</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {POLICY_PROPOSAL_ENVIRONMENTS.map((id) => (
            <Chip key={id} pressed={environment === id} label={POLICY_PROPOSAL_ENVIRONMENT_LABELS[id]} onClick={() => setEnvironment(id)} />
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>Platform / runtime</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {POLICY_PROPOSAL_PLATFORMS.map((id) => (
            <Chip key={id} pressed={platform === id} label={POLICY_PROPOSAL_PLATFORM_LABELS[id]} onClick={() => setPlatform(id)} />
          ))}
        </div>
      </fieldset>
      <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
        <legend style={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>Optional capabilities</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {POLICY_PROPOSAL_CAPABILITIES.map((id) => (
            <Chip key={id} pressed={capabilities.includes(id)} label={POLICY_PROPOSAL_CAPABILITY_LABELS[id]} onClick={() => toggle(capabilities, id, setCapabilities)} />
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" style={{ fontFamily: FONT, fontSize: "0.8rem", color: "#f87171", margin: 0 }}>{error}</p>}
      {status && <p role="status" style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>{status}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
        <Btn size="sm" onClick={() => void submit()}>Submit proposal</Btn>
        <Link href="/developers/integration-studio" style={{ color: "#2DD4BF", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700 }}>Policy Fit</Link>
        <Link href="/docs/starter-kit" style={{ color: "#2DD4BF", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700 }}>Starter Kit</Link>
        <Link href="/docs/partner-flow" style={{ color: "#2DD4BF", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700 }}>Partner Flow</Link>
        <Link href="/design-partner" style={{ color: "#2DD4BF", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700 }}>Design Partner</Link>
      </div>
    </form>
  );
}
