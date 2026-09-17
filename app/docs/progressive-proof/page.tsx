// FILE: app/docs/progressive-proof/page.tsx
// Short developer guide for progressive proof: account creation, evidence, and eligibility.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

const receiptExample = `const receipt = await fetch(
  \`${"${ABRAXAS_ORIGIN}"}/api/receipts/${"${receiptId}"}/public\`,
  { cache: "no-store" },
).then((response) => response.json());

const allowed =
  receipt.signature_valid === true &&
  receipt.currently_valid === true &&
  receipt.decision === "approved" &&
  receipt.partner_id === "your-partner-id" &&
  receipt.policy_id === "your-policy-v1";

if (!allowed) return denyAccess();
return grantAccess();`;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        fontFamily: MONO,
        fontSize: "0.67rem",
        lineHeight: 1.6,
        padding: "1rem",
        borderRadius: 10,
        overflowX: "auto",
        background: "var(--surface-inset)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        margin: 0,
      }}
    >
      {children}
    </pre>
  );
}

export default function ProgressiveProofDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Progressive proof"
        title="Ask for proof only when a policy needs it"
        subtitle="Google zkLogin starts an account. A partner policy determines which additional evidence, if any, is needed."
      />

      <ContentCard title="The boundary that keeps integration simple">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div style={cardStyle}>
            <strong style={headingStyle}>1. Account</strong>
            <p style={body}>Google zkLogin creates or opens an Abraxas Passport. It does not establish age, identity, residency, or purchase eligibility.</p>
          </div>
          <div style={cardStyle}>
            <strong style={headingStyle}>2. Evidence</strong>
            <p style={body}>Abraxas reuses active evidence when it satisfies the partner policy, then asks only for missing proof. Evidence can expire, be revoked, or require review.</p>
          </div>
          <div style={cardStyle}>
            <strong style={headingStyle}>3. Decision</strong>
            <p style={body}>Your app receives a signed decision receipt. It verifies the receipt on its server and gates access from the verified result.</p>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="What your integration does">
        <BulletList items={[
          "Send the holder to /partner/verify with your partner ID, policy ID, and an allowlisted return URL.",
          "Receive the callback, then send the receipt ID to your backend.",
          "Fetch the public receipt from your backend and validate its decision, signature, current validity, partner, and policy.",
          "Grant access only after all checks pass. Treat every missing, expired, revoked, pending, or mismatched proof as not eligible.",
        ]} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/docs/partner-flow" size="sm">Partner Flow guide →</Btn>
          <Btn href="/docs/relying-party-verify" variant="secondary" size="sm">Server API guide →</Btn>
          <Btn href="/demo/reference-partner" variant="ghost" size="sm">Try reference demo →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Server-side receipt check">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          Never grant access from callback query parameters alone. Fetch the receipt on your server and fail closed when any check is absent or false.
        </p>
        <CodeBlock>{receiptExample}</CodeBlock>
      </ContentCard>

      <ContentCard title="Good Trouble browse example">
        <p style={body}>
          A browse policy can use an L0 birthday self-attestation and issue a signed browse receipt. That receipt may permit browsing, but it is explicitly <code style={inlineCode}>valid_for_purchase: false</code>.
        </p>
        <p style={{ ...body, marginTop: "0.6rem" }}>
          A retail policy asks for stronger evidence. The browse receipt cannot unlock retail access because it is bound to the browse policy and has insufficient assurance.
        </p>
      </ContentCard>

      <ContentCard title="States your product should expect">
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {[
            ["signed_in", "The account exists; no eligibility promise has been made."],
            ["proof_needed", "The policy needs additional evidence."],
            ["pending", "Evidence is under review; do not grant access."],
            ["eligible", "The required policy proof is active and verified."],
            ["denied", "The policy was not satisfied or evidence was revoked."],
            ["expired", "Previously held evidence is no longer valid."],
            ["error", "Fail closed and offer a safe retry path."],
          ].map(([state, description]) => (
            <div key={state} style={{ display: "grid", gridTemplateColumns: "8.5rem 1fr", gap: "0.75rem", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
              <code style={{ ...inlineCode, color: ACCENT, fontWeight: 700 }}>{state}</code>
              <span style={body}>{description}</span>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Privacy by default">
        <BulletList items={[
          "Partners receive the decision and limited receipt metadata, not raw identity documents, selfies, dates of birth, or addresses.",
          "Google sign-in is authentication only. It never substitutes for a regulated proof requirement.",
          "A receipt is scoped to its partner and policy. Re-check it before every protected action that requires current eligibility.",
        ]} />
      </ContentCard>

      <p style={{ ...body, marginBottom: "2rem" }}>
        Ready to connect a policy? <Link href="/integrations#apply" style={{ color: ACCENT, fontWeight: 700 }}>Apply as a design partner →</Link>
      </p>
    </RedesignPage>
  );
}

const cardStyle: React.CSSProperties = {
  padding: "0.85rem",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
};

const headingStyle: React.CSSProperties = {
  display: "block",
  fontFamily: FONT,
  fontSize: "0.88rem",
  color: "var(--text-primary)",
  marginBottom: "0.3rem",
};

const inlineCode: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: "0.74rem",
};
