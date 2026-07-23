"use client";
// FILE: app/docs/partner-verification-requests/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export default function PartnerVerificationRequestsPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Integrators · Step 4"
        title="Partner verification requests"
        subtitle="Portable reuse loop. partner creates request, holder consents, policy engine returns decision."
      />

      <ContentCard title="Create a request (server-side)">
        <pre style={{
          fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)",
          overflow: "auto", margin: 0, padding: "0.75rem", borderRadius: 10,
          background: "var(--surface-raised)", border: "1px solid var(--border)",
        }}>
{`POST /api/v1/verification-requests
Authorization: Bearer abx_live_YOUR_KEY

{
  "policy_id": "cielo-verified-guest-v1",
  "requested_action": "verified_rate",
  "sui_address": "0x…"
}

→ { request_id, consent_url, expires_at }`}
        </pre>
      </ContentCard>

      <ContentCard title="Holder consent">
        <BulletList items={[
          "Redirect holder to consent_url (/passport?verify_request=…)",
          "Holder sees selective disclosure preview. claims only, never documents",
          "Approve → POST …/consent (browser session, not client wallet spoofing)",
          "Decline → POST …/decline. request cancelled",
        ]} />
      </ContentCard>

      <ContentCard title="Poll decision">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
          After approval, poll{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.72rem" }}>GET /api/v1/decisions/&#123;id&#125;/status</code>{" "}
          before settlement. Decisions can expire or be revoked. fail closed.
        </p>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/passport" size="lg">Open Passport →</Btn>
        <Btn href="/developers/partner" variant="secondary" size="lg">Partner dashboard</Btn>
        <Btn href="/docs/credential-portability" variant="ghost" size="lg">Credential portability</Btn>
      </div>
    </RedesignPage>
  );
}
