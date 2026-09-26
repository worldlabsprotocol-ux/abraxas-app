// FILE: app/good-trouble/access/page.tsx
// Server-verified Good Trouble destination. Query parameters select a receipt; they never grant access.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { ContentCard, PageHeader } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { decideGoodTroubleAccess } from "@/lib/goodTrouble/accessDecision";
import {
  GOOD_TROUBLE_BRAND,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

export const dynamic = "force-dynamic";

const FONT = ABRAXAS_FONT_SANS;

export default async function GoodTroubleAccessPage({
  searchParams,
}: {
  searchParams: { receipt_id?: string | string[] };
}) {
  const rawReceiptId = searchParams.receipt_id;
  const receiptId = (Array.isArray(rawReceiptId) ? rawReceiptId[0] : rawReceiptId)?.trim() ?? "";
  const result = receiptId
    ? await decideGoodTroubleAccess({ receipt_id: receiptId }).catch(() => null)
    : null;
  const granted = result?.grant === true;

  const receiptVerifierHref = receiptId
    ? `/verify?mode=receipt&receipt_id=${encodeURIComponent(receiptId)}&partner_id=${encodeURIComponent(GOOD_TROUBLE_PARTNER_ID)}&policy_id=${encodeURIComponent(GOOD_TROUBLE_RETAIL_POLICY_ID)}&allow_sandbox=1`
    : "/verify?mode=receipt";

  return (
    <RedesignPage accent="partner" maxWidth={680}>
      <PageHeader
        eyebrow={`${GOOD_TROUBLE_BRAND.name} · Verified entry`}
        title={granted ? "21+ access confirmed" : "Access needs verification"}
        subtitle={granted
          ? "The signed eligibility receipt was checked again by the partner server before this page was unlocked."
          : "Good Trouble could not confirm a current signed eligibility receipt for this visit."}
      />

      {granted ? (
        <>
          <ContentCard title="You can continue">
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <p style={bodyStyle}>
                Good Trouble received an approved 21+ eligibility result for this sandbox visit.
              </p>
              <div style={{
                padding: "0.8rem",
                borderRadius: 12,
                border: "1px solid rgba(94,234,212,0.22)",
                background: "rgba(94,234,212,0.06)",
              }}>
                <p style={{ ...bodyStyle, marginBottom: "0.3rem", color: "var(--text-primary)", fontWeight: 750 }}>
                  Shared: approved eligibility result
                </p>
                <p style={bodyStyle}>
                  Kept private: birth date, government ID images, biometrics, and document data.
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
                <Btn href="/good-trouble#pilot-inventory" size="lg">Browse pilot inventory →</Btn>
                <Btn href="/passport#passport-verification-activity-heading" variant="secondary">Open Passport activity</Btn>
                <Btn href={receiptVerifierHref} variant="secondary">Verify receipt</Btn>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Why this page is trusted">
            <p style={bodyStyle}>
              The receipt ID in the URL only identifies the result. The server fetched the public receipt and checked its signature, partner, policy, decision, status, expiry, and sandbox scope before granting this view.
            </p>
          </ContentCard>
        </>
      ) : (
        <ContentCard title="No access was granted">
          <div style={{ display: "grid", gap: "0.8rem" }}>
            <p style={bodyStyle}>
              The receipt may be missing, expired, revoked, unavailable, or issued for a different partner or policy. Start the verification flow again to continue.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
              <Btn href="/good-trouble/checkout" size="lg">Verify again →</Btn>
              {receiptId && <Btn href={receiptVerifierHref} variant="secondary">Inspect receipt</Btn>}
              <Btn href="/good-trouble" variant="ghost">Return to Good Trouble</Btn>
            </div>
          </div>
        </ContentCard>
      )}

      <ContentCard title="Sandbox scope">
        <p style={bodyStyle}>
          This reference journey demonstrates server-verified age eligibility. It does not complete a purchase, move funds, or grant production access.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}

const bodyStyle = {
  fontFamily: FONT,
  fontSize: "0.86rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
} as const;
