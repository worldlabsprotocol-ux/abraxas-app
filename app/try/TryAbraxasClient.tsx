"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";
import { normalizePublicPolicyItems } from "@/lib/partner/publicPolicyPreview";
import { resolveHolderFacingApiOrigin } from "@/lib/product/canonicalProductOrigin";
import styles from "./TryAbraxas.module.css";

type PublicPolicy = {
  id: string;
  label: string;
  user_explanation: string;
  disclosed_result: string;
  receipt_claim: string;
  receipt_lifetime_hours: number;
  required_claims: string[];
  minimum_assurance: string;
  intended_use_examples: string[];
  partner_receives: string | string[];
  partner_does_not_receive: string | string[];
  production_suitability: string;
};

type CatalogResponse = {
  ok?: boolean;
  policies?: PublicPolicy[];
  google_account_not_eligibility?: string;
};

type SetupGoal = {
  id: string;
  title: string;
  detail: string;
  match: RegExp;
};

const SETUP_GOALS: SetupGoal[] = [
  { id: "age_gated_access", title: "Age-gated access", detail: "Let eligible customers enter, browse, or purchase.", match: /age|21|18/i },
  { id: "regional_access", title: "Regional access", detail: "Check whether a customer is allowed in a jurisdiction.", match: /residen|jurisdiction|region/i },
  { id: "member_access", title: "Member or credential access", detail: "Open a product or service to qualified members.", match: /member|credential|collector/i },
  { id: "wallet_control", title: "Wallet-controlled action", detail: "Require current control before a sensitive action.", match: /wallet/i },
  { id: "institutional_access", title: "Institutional protocol access", detail: "Gate protocol actions to an eligible organization.", match: /institution|organization|protocol/i },
  { id: "custom", title: "Something specific", detail: "Describe the result your product needs.", match: /$a/ },
];

const FALLBACK_POLICIES: PublicPolicy[] = [
  {
    id: "age_21",
    label: "Age 21 eligibility",
    user_explanation: "Confirm a person meets a 21+ threshold without sharing a birth date.",
    disclosed_result: "eligible_21",
    receipt_claim: "age_21",
    receipt_lifetime_hours: 24,
    required_claims: ["age_over_21"],
    minimum_assurance: "L2",
    intended_use_examples: ["Age-gated access", "Regulated product eligibility"],
    partner_receives: ["Current eligibility result", "Policy and receipt identifiers", "Expiry"],
    partner_does_not_receive: ["Date of birth", "Government ID images", "Raw identity documents"],
    production_suitability: "Production eligible after safety review",
  },
  {
    id: "residency",
    label: "Residency or jurisdiction",
    user_explanation: "Confirm a jurisdiction rule passed without sharing a full address.",
    disclosed_result: "jurisdiction_eligible",
    receipt_claim: "residency",
    receipt_lifetime_hours: 24,
    required_claims: ["jurisdiction_eligible"],
    minimum_assurance: "L2",
    intended_use_examples: ["Region-limited products", "Jurisdiction screening"],
    partner_receives: ["Current policy result", "Receipt expiry"],
    partner_does_not_receive: ["Street address", "Government ID images", "Raw documents"],
    production_suitability: "Production eligible after safety review",
  },
];

function PolicyList({ items }: { items: unknown }) {
  const normalized = normalizePublicPolicyItems(items);
  return (
    <ul className={styles.list}>
      {(normalized.length ? normalized : ["None"]).map((item) => (
        <li key={item}>{item.replaceAll("_", " ")}</li>
      ))}
    </ul>
  );
}

export function TryAbraxasClient() {
  const [policies, setPolicies] = useState<PublicPolicy[]>(FALLBACK_POLICIES);
  const [goalId, setGoalId] = useState(SETUP_GOALS[0].id);
  const [customGoal, setCustomGoal] = useState("");
  const [selectedId, setSelectedId] = useState(FALLBACK_POLICIES[0].id);
  const [callbackUrl, setCallbackUrl] = useState("https://your-app.example/abraxas/callback");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/launchpad/policies", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<CatalogResponse>;
      })
      .then((result) => {
        if (cancelled || !result?.policies?.length) return;
        setPolicies(result.policies);
        setSelectedId((current) => result.policies?.some((policy) => policy.id === current)
          ? current
          : result.policies![0].id);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const selected = policies.find((policy) => policy.id === selectedId) ?? policies[0];
  const selectedGoal = SETUP_GOALS.find((goal) => goal.id === goalId) ?? SETUP_GOALS[0];
  const setupReason = goalId === "custom" && customGoal.trim() ? customGoal.trim() : selectedGoal.title;

  function chooseGoal(goalIdValue: string) {
    const goal = SETUP_GOALS.find((item) => item.id === goalIdValue);
    if (!goal) return;
    setGoalId(goal.id);
    if (goal.id === "custom") return;
    const recommended = policies.find((policy) => goal.match.test([
      policy.id,
      policy.label,
      policy.user_explanation,
      ...policy.intended_use_examples,
    ].join(" ")));
    if (recommended) setSelectedId(recommended.id);
  }

  const integration = useMemo(() => {
    const safeCallback = callbackUrl.trim() || "https://your-app.example/abraxas/callback";
    const apiOrigin = resolveHolderFacingApiOrigin();
    return `// Run this on your server after creating a sandbox partner key.
const response = await fetch("${apiOrigin}/api/v1/verify/authorize", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "******"
  },
  body: JSON.stringify({
    policy_id: "${selected.id}",
    redirect_uri: "${safeCallback}",
    requested_action: "${setupReason.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "access"}"
  })
});

const { hosted_connect_url } = await response.json();
// Redirect the holder to hosted_connect_url.`;
  }, [callbackUrl, selected.id, setupReason]);

  async function copyIntegration() {
    await navigator.clipboard.writeText(integration);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Try Abraxas</p>
        <h1>Explore private eligibility.</h1>
        <p>See what a policy checks and what stays private. No account needed.</p>
        <div className={styles.actions}>
          <Btn href="/developers/integration-studio" size="lg">Build in Integration Studio</Btn>
          <Link className={styles.exploreLink} href="#try-explorer">Explore the preview</Link>
        </div>
      </header>

      <section id="try-explorer" className={styles.explorer} aria-labelledby="try-explorer-title">
        <div className={styles.sectionIntro}>
          <h2 id="try-explorer-title">Explore a policy</h2>
          <p>Choose an outcome to see a matching policy and its privacy boundary.</p>
        </div>

        <div className={styles.fields}>
          <label className={styles.field} htmlFor="try-goal">
            What do you want Abraxas to enable?
            <select id="try-goal" value={goalId} onChange={(event) => chooseGoal(event.target.value)}>
              {SETUP_GOALS.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
            </select>
          </label>

          {goalId === "custom" ? (
            <label className={styles.field} htmlFor="try-custom-goal">
              Describe the result your product needs
              <textarea
                id="try-custom-goal"
                value={customGoal}
                onChange={(event) => setCustomGoal(event.target.value)}
                placeholder="For example, confirm a supplier is authorized for a transaction."
                rows={3}
              />
            </label>
          ) : null}

          <label className={styles.field} htmlFor="try-policy">
            Recommended policy
            <select id="try-policy" value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
              {policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.label}</option>)}
            </select>
          </label>
        </div>

        <p className={styles.policyExplanation}>{selected.user_explanation}</p>

        <div className={styles.privacyBoundary}>
          <section aria-labelledby="try-receives-title">
            <h3 id="try-receives-title">Your app receives</h3>
            <PolicyList items={selected.partner_receives} />
          </section>
          <section aria-labelledby="try-private-title">
            <h3 id="try-private-title">Stays private</h3>
            <PolicyList items={selected.partner_does_not_receive} />
          </section>
        </div>

        <details className={styles.technicalDetails}>
          <summary>Technical receipt details</summary>
          <dl>
            <div><dt>Result</dt><dd><code>{selected.disclosed_result}</code></dd></div>
            <div><dt>Assurance</dt><dd><code>{selected.minimum_assurance}</code></dd></div>
            <div><dt>Receipt lifetime</dt><dd><code>{selected.receipt_lifetime_hours} hours</code></dd></div>
          </dl>
        </details>
      </section>

      <section className={styles.sandbox} aria-labelledby="try-sandbox-title">
        <div>
          <h2 id="try-sandbox-title">Ready to build?</h2>
          <p>Continue in Integration Studio, or open Partner Launchpad to save a setup and run a hosted sandbox test.</p>
        </div>
        <div className={styles.actions}>
          <Btn href="/developers/integration-studio" size="sm">Open Integration Studio</Btn>
          <Btn href="/developers/launchpad" variant="secondary" size="sm">Run a sandbox test</Btn>
        </div>
      </section>

      <details className={styles.developerDetails}>
        <summary>Developer reference</summary>
        <div className={styles.developerContent}>
          <p>Preview the server request shape. Run it on your server with a sandbox partner key.</p>
          <label className={styles.field} htmlFor="try-callback">
            Callback URL
            <input
              id="try-callback"
              type="url"
              value={callbackUrl}
              onChange={(event) => setCallbackUrl(event.target.value)}
            />
          </label>
          <pre className={`abx-code-scroll ${styles.code}`}><code>{integration}</code></pre>
          <Btn onClick={() => void copyIntegration()} size="sm">{copied ? "Copied" : "Copy server request"}</Btn>
        </div>
      </details>

      <nav className={styles.moreLinks} aria-label="More Abraxas paths">
        <Link href="/integrations#apply">Apply for partner review</Link>
        <Link href="/passport">Open Passport</Link>
      </nav>
      <p className={styles.previewStatus}>Interactive sandbox preview · not saved · no credentials issued · no production access</p>
    </div>
  );
}
