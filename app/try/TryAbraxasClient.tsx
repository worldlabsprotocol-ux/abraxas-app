"use client";
// FILE: app/try/TryAbraxasClient.tsx
// A no-auth, read-only preview of the real Launchpad policy catalog and integration shape.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalizePublicPolicyItems } from "@/lib/partner/publicPolicyPreview";

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

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const TEAL = "#2DD4BF";
const GOLD = "#E8C547";

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

function Panel({ children, accent = TEAL }: { children: React.ReactNode; accent?: string }) {
  return (
    <section style={{
      border: `1px solid ${accent}33`,
      borderRadius: 18,
      padding: "clamp(1rem, 3vw, 1.45rem)",
      background: "linear-gradient(145deg, rgba(27,40,65,.84), rgba(14,23,40,.94))",
      boxShadow: "0 16px 44px rgba(0,0,0,.24)",
    }}>
      {children}
    </section>
  );
}

function List({ items, empty = "None" }: { items: unknown; empty?: string }) {
  const normalized = normalizePublicPolicyItems(items);
  return (
    <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--text-secondary)", lineHeight: 1.65, fontSize: "0.82rem" }}>
      {(normalized.length ? normalized : [empty]).map((item) => <li key={item}>{item.replaceAll("_", " ")}</li>)}
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
  const [setupPath, setSetupPath] = useState<"browser" | "developer">("browser");

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

  function chooseGoal(goal: SetupGoal) {
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
    return `// Run this on your server after creating a sandbox partner key.
const response = await fetch("https://demo.abraxasworld.xyz/api/v1/verify/authorize", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_SANDBOX_KEY"
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
    <div style={{ fontFamily: FONT, paddingBottom: "2rem" }}>
      <header style={{ textAlign: "center", margin: "1rem auto 1.6rem", maxWidth: 760 }}>
        <p className="abx-eyebrow-violet" style={{ margin: "0 0 .7rem" }}>INTERACTIVE PRODUCT PREVIEW</p>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.45rem)", letterSpacing: "-.045em", lineHeight: 1.04, margin: "0 0 .8rem" }}>
          Build a private eligibility flow around your use case.
        </h1>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 auto", maxWidth: 650 }}>
          Explore the real Abraxas policy catalog and integration shape. No Google sign-in, wallet, API key, or admin access is required for this preview.
        </p>
      </header>

      <div aria-label="Preview steps" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: ".55rem", marginBottom: "1.3rem" }}>
        {["1. Choose your goal", "2. Pick the policy", "3. Review privacy", "4. Start testing"].map((step) => (
          <span key={step} style={{ border: `1px solid ${TEAL}55`, background: `${TEAL}12`, borderRadius: 999, padding: ".45rem .75rem", fontSize: ".75rem", fontWeight: 800 }}>
            {step}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        <Panel accent={GOLD}>
          <p style={{ fontFamily: MONO, color: GOLD, fontSize: ".68rem", letterSpacing: ".08em", margin: "0 0 .4rem" }}>STEP 1 · YOUR GOAL</p>
          <h2 style={{ margin: "0 0 .45rem", fontSize: "1.35rem" }}>What do you want Abraxas to enable?</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: ".82rem", margin: "0 0 1rem", lineHeight: 1.55 }}>
            Start with the outcome. Abraxas will recommend a policy while you stay free to choose another.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: ".65rem" }}>
            {SETUP_GOALS.map((goal) => {
              const active = goal.id === goalId;
              return (
                <button key={goal.id} type="button" onClick={() => chooseGoal(goal)} aria-pressed={active} style={{
                  textAlign: "left", padding: ".9rem", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${active ? GOLD : "rgba(255,255,255,.12)"}`,
                  background: active ? `${GOLD}12` : "rgba(255,255,255,.025)",
                  color: "var(--text-primary)",
                }}>
                  <strong style={{ display: "block", marginBottom: ".3rem" }}>{goal.title}</strong>
                  <span style={{ display: "block", color: "var(--text-secondary)", fontSize: ".75rem", lineHeight: 1.5 }}>{goal.detail}</span>
                </button>
              );
            })}
          </div>
          {goalId === "custom" && (
            <div style={{ marginTop: ".9rem" }}>
              <label htmlFor="try-custom-goal" style={{ display: "block", fontSize: ".78rem", fontWeight: 800, marginBottom: ".4rem" }}>
                Describe the result your product needs
              </label>
              <textarea id="try-custom-goal" value={customGoal} onChange={(event) => setCustomGoal(event.target.value)} placeholder="Example: Confirm a supplier is authorized for this transaction without receiving their private documents." style={{
                width: "100%", minHeight: 86, resize: "vertical", borderRadius: 10,
                border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.22)",
                color: "var(--text-primary)", padding: ".75rem", fontFamily: FONT, lineHeight: 1.5,
              }} />
            </div>
          )}
        </Panel>

        <Panel>
          <p style={{ fontFamily: MONO, color: TEAL, fontSize: ".68rem", letterSpacing: ".08em", margin: "0 0 .4rem" }}>STEP 2 · RECOMMENDED POLICY</p>
          <h2 style={{ margin: "0 0 .45rem", fontSize: "1.35rem" }}>What should your product verify?</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: ".82rem", margin: "0 0 1rem", lineHeight: 1.55 }}>
            These are the same versioned policy packs exposed to Partner Launchpad.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: ".65rem" }}>
            {policies.map((policy) => {
              const active = policy.id === selected.id;
              return (
                <button key={policy.id} type="button" onClick={() => setSelectedId(policy.id)} aria-pressed={active} style={{
                  textAlign: "left", padding: ".9rem", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${active ? TEAL : "rgba(255,255,255,.12)"}`,
                  background: active ? `${TEAL}14` : "rgba(255,255,255,.025)",
                  color: "var(--text-primary)",
                }}>
                  <strong style={{ display: "block", marginBottom: ".35rem" }}>{policy.label}</strong>
                  <span style={{ display: "block", color: active ? TEAL : "var(--text-muted)", fontFamily: MONO, fontSize: ".66rem", lineHeight: 1.4 }}>
                    {active ? "RECOMMENDED · SELECTED" : "CHOOSE POLICY"}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel accent={GOLD}>
          <p style={{ fontFamily: MONO, color: GOLD, fontSize: ".68rem", letterSpacing: ".08em", margin: "0 0 .4rem" }}>STEP 3 · PRIVACY BOUNDARY</p>
          <h2 style={{ margin: "0 0 .3rem", fontSize: "1.35rem" }}>{selected.label}</h2>
          <p style={{ margin: "0 0 1rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{selected.user_explanation}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: ".8rem" }}>
            <div style={{ padding: "1rem", borderRadius: 12, background: `${TEAL}0D`, border: `1px solid ${TEAL}33` }}>
              <h3 style={{ color: TEAL, fontSize: ".86rem", margin: "0 0 .55rem" }}>Your server receives</h3>
              <List items={selected.partner_receives} />
            </div>
            <div style={{ padding: "1rem", borderRadius: 12, background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.24)" }}>
              <h3 style={{ color: "#C4B5FD", fontSize: ".86rem", margin: "0 0 .55rem" }}>Stays private</h3>
              <List items={selected.partner_does_not_receive} />
            </div>
          </div>
          <details style={{ marginTop: ".85rem", color: "var(--text-secondary)", fontSize: ".75rem" }}>
            <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontWeight: 800 }}>Technical receipt details</summary>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginTop: ".65rem" }}>
              <span>Result: <code>{selected.disclosed_result}</code></span>
              <span>Assurance: <code>{selected.minimum_assurance}</code></span>
              <span>Receipt: <code>{selected.receipt_lifetime_hours}h</code></span>
            </div>
          </details>
        </Panel>

        <Panel>
          <p style={{ fontFamily: MONO, color: TEAL, fontSize: ".68rem", letterSpacing: ".08em", margin: "0 0 .4rem" }}>STEP 4 · START TESTING</p>
          <h2 style={{ margin: "0 0 .45rem", fontSize: "1.35rem" }}>Choose how you want to continue</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: ".82rem", margin: "0 0 1rem", lineHeight: 1.55 }}>
            Everything can be set up in the browser. Code is available when a developer is ready to connect the finished flow.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: ".7rem", marginBottom: "1rem" }}>
            <button type="button" onClick={() => setSetupPath("browser")} aria-pressed={setupPath === "browser"} style={{
              textAlign: "left", padding: "1rem", borderRadius: 14, cursor: "pointer",
              border: `1px solid ${setupPath === "browser" ? GOLD : "rgba(255,255,255,.12)"}`,
              background: setupPath === "browser" ? `${GOLD}12` : "rgba(255,255,255,.025)",
              color: "var(--text-primary)",
            }}>
              <strong style={{ display: "block", marginBottom: ".35rem" }}>Use the browser</strong>
              <span style={{ color: "var(--text-secondary)", fontSize: ".75rem", lineHeight: 1.5 }}>Save the policy and run a hosted sandbox test. No terminal required.</span>
            </button>
            <button type="button" onClick={() => setSetupPath("developer")} aria-pressed={setupPath === "developer"} style={{
              textAlign: "left", padding: "1rem", borderRadius: 14, cursor: "pointer",
              border: `1px solid ${setupPath === "developer" ? TEAL : "rgba(255,255,255,.12)"}`,
              background: setupPath === "developer" ? `${TEAL}12` : "rgba(255,255,255,.025)",
              color: "var(--text-primary)",
            }}>
              <strong style={{ display: "block", marginBottom: ".35rem" }}>Connect with code</strong>
              <span style={{ color: "var(--text-secondary)", fontSize: ".75rem", lineHeight: 1.5 }}>Copy the server request when your developer is ready.</span>
            </button>
          </div>

          {setupPath === "browser" ? (
            <div>
              <div style={{ display: "grid", gap: ".55rem", marginBottom: ".9rem" }}>
                {[
                  ["1", "Save your setup", "Open Partner Launchpad and create a sandbox application."],
                  ["2", "Confirm the policy", `Use ${selected.label} and add your return page.`],
                  ["3", "Run the hosted test", "Follow the on-screen test flow and review the result."],
                ].map(([number, title, detail]) => (
                  <div key={number} style={{ display: "grid", gridTemplateColumns: "2rem 1fr", gap: ".7rem", padding: ".75rem", borderRadius: 12, background: "rgba(255,255,255,.035)" }}>
                    <span style={{ width: "2rem", height: "2rem", display: "grid", placeItems: "center", borderRadius: 999, background: `${GOLD}18`, color: GOLD, fontWeight: 900 }}>{number}</span>
                    <div>
                      <strong style={{ display: "block", fontSize: ".82rem", marginBottom: ".15rem" }}>{title}</strong>
                      <span style={{ color: "var(--text-secondary)", fontSize: ".75rem", lineHeight: 1.45 }}>{detail}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/developers/launchpad" style={{ display: "inline-block", textDecoration: "none", borderRadius: 999, padding: ".75rem 1rem", background: GOLD, color: "#09111F", fontWeight: 900 }}>
                Continue in the browser →
              </Link>
              <p style={{ color: "var(--text-muted)", fontSize: ".68rem", margin: ".65rem 0 0" }}>Sandbox setup stays in the website. A developer is only needed when connecting Abraxas to your live product.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="try-callback" style={{ display: "block", fontSize: ".78rem", fontWeight: 800, marginBottom: ".4rem" }}>Your callback URL</label>
              <input id="try-callback" type="url" value={callbackUrl} onChange={(event) => setCallbackUrl(event.target.value)} style={{
                width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.22)",
                color: "var(--text-primary)", padding: ".75rem", fontFamily: MONO, fontSize: ".75rem", marginBottom: ".75rem",
              }} />
              <details>
                <summary style={{ cursor: "pointer", color: TEAL, fontWeight: 850, marginBottom: ".7rem" }}>Show server request</summary>
                <pre className="abx-code-scroll" style={{ whiteSpace: "pre", padding: "1rem", borderRadius: 12, background: "#05080F", border: "1px solid rgba(255,255,255,.1)", color: "#D1FAE5", fontSize: ".7rem", lineHeight: 1.6 }}>
                  <code>{integration}</code>
                </pre>
              </details>
              <button type="button" onClick={() => void copyIntegration()} style={{
                border: 0, borderRadius: 999, background: TEAL, color: "#04130C", padding: ".7rem 1rem", fontWeight: 900, cursor: "pointer",
              }}>
                {copied ? "Copied" : "Copy server request"}
              </button>
            </div>
          )}
        </Panel>

        <section style={{ textAlign: "center", padding: "1.25rem 1rem" }}>
          <h2 style={{ margin: "0 0 .45rem", fontSize: "1.35rem" }}>Ready to save and test it?</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 auto 1rem", maxWidth: 660, fontSize: ".84rem" }}>
            The preview never changes live data. Open Partner Launchpad to create a saved sandbox application, or apply for partner access. Passport sign-in is only needed when a holder saves or approves a real request.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: ".65rem" }}>
            <Link href="/developers/launchpad" style={{ textDecoration: "none", borderRadius: 999, padding: ".75rem 1rem", background: GOLD, color: "#09111F", fontWeight: 900 }}>
              Open Partner Launchpad →
            </Link>
            <Link href="/integrations#apply" style={{ textDecoration: "none", borderRadius: 999, padding: ".75rem 1rem", border: `1px solid ${TEAL}66`, color: TEAL, fontWeight: 850 }}>
              Apply for partner review
            </Link>
            <Link href="/passport" style={{ textDecoration: "none", borderRadius: 999, padding: ".75rem 1rem", color: "var(--text-secondary)", fontWeight: 750 }}>
              Open Passport
            </Link>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: ".68rem", marginTop: ".8rem" }}>Interactive sandbox preview · not saved · no credentials issued · no production access</p>
        </section>
      </div>
    </div>
  );
}
