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
  POLICY_PROPOSAL_PLATFORM_LABELS,
  POLICY_PROPOSAL_PLATFORMS,
  POLICY_PROPOSAL_PRIVATE,
  POLICY_PROPOSAL_PRIVATE_LABELS,
  POLICY_PROPOSAL_RECEIVE_LABELS,
  POLICY_PROPOSAL_RECEIVES,
  POLICY_PROPOSAL_RESULT_LABELS,
  POLICY_PROPOSAL_RESULTS,
} from "@/lib/partner/policyProposal/contract";
import {
  POLICY_FIT_CAPABILITY_TO_PATH,
  POLICY_FIT_CATEGORY_TO_PACK,
  isPolicyFitCapability,
  isPolicyFitCategory,
} from "@/lib/partner/integrationStudio/policyFit/contract";

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
  const studioHref = useMemo(() => {
    const pack = isPolicyFitCategory(result)
      ? POLICY_FIT_CATEGORY_TO_PACK[result]
      : "sandbox_institutional_protocol_access";
    const primaryCapability = capabilities.find(isPolicyFitCapability);
    const path = primaryCapability
      ? POLICY_FIT_CAPABILITY_TO_PATH[primaryCapability]
      : "hosted_partner_flow";
    const params = new URLSearchParams({
      pack,
      path,
      platform: platform === "typescript_nextjs" ? "nextjs" : "universal_https",
      source: "browser-builder",
      action,
      environment,
    });
    const capabilityMap: Record<string, string> = {
      webhook: "webhooks",
      trading_preflight: "trading_venue",
      payment_preflight: "payment_authorization",
      wallet_standard_binding: "wallet_standard_binding",
      solana_gate: "solana_gate",
    };
    capabilities.forEach((capability) => {
      const mapped = capabilityMap[capability];
      if (mapped) params.append("capability", mapped);
    });
    return `/developers/integration-studio?${params.toString()}`;
  }, [action, result, environment, platform, capabilities]);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  return (
    <form
      role="form"
      aria-labelledby="policy-proposal-heading"
      onSubmit={(event) => event.preventDefault()}
      style={{ display: "grid", gap: "0.85rem", textAlign: "left" }}
    >
      <h3 id="policy-proposal-heading" style={{ fontFamily: FONT, fontSize: "1rem", margin: 0 }}>
        Build the gate your product needs
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
        Your choices build a sandbox integration immediately. No sign-in is required until you save credentials or request Production access.
      </p>
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
        <Btn href={studioHref} size="sm">Build this integration →</Btn>
        <Link href="/docs/starter-kit" style={{ color: "#2DD4BF", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700 }}>Starter Kit</Link>
        <Link href="/docs/partner-flow" style={{ color: "#2DD4BF", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700 }}>Partner Flow</Link>
        <Link href="/design-partner" style={{ color: "#2DD4BF", fontFamily: FONT, fontSize: "0.8rem", fontWeight: 700 }}>Design Partner</Link>
      </div>
    </form>
  );
}
