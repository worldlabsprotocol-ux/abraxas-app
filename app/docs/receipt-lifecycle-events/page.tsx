"use client";
// FILE: app/docs/receipt-lifecycle-events/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { PublicJourneyNextSteps } from "@/components/product/PublicJourneyNextSteps";
import {
  RECEIPT_LIFECYCLE_CHECKLIST,
  RECEIPT_LIFECYCLE_EVENT_TYPES,
  RECEIPT_LIFECYCLE_NOT_GRANT,
  RECEIPT_LIFECYCLE_SCHEDULING_POSTURE,
} from "@/lib/partner/receiptLifecycle/contract";
import { PUBLIC_FONT_SANS } from "@/lib/design/publicSurface";

const FONT = PUBLIC_FONT_SANS;

export default function ReceiptLifecycleEventsDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={860}>
      <PageHeader
        eyebrow="Developers · Partner Event Delivery"
        title="Receipt lifecycle events"
        subtitle="Learn when your partner-bound receipt was issued, is nearing expiry, was revoked, or became invalid—without receiving private evidence."
      />
      <ContentCard title="Notifications, not grants">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          {RECEIPT_LIFECYCLE_NOT_GRANT}
        </p>
      </ContentCard>
      <ContentCard title="Event types">
        <BulletList items={[...RECEIPT_LIFECYCLE_EVENT_TYPES]} />
      </ContentCard>
      <ContentCard title="Safe envelope">
        <BulletList items={[
          "Opaque event_ref, event type, occurred time, policy/version, validity class, expiry when applicable.",
          "must_reverify is always true. is_grant is always false.",
          "HMAC uses the existing Partner Event Delivery signing headers.",
          "Retries reuse the same idempotency key. A revoked or invalidated receipt cannot become valid through replay.",
        ]} />
      </ContentCard>
      <ContentCard title="Holder withdrawal">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          When a holder withdraws a shared result, that partner receives a terminal revoked event. Derived partner-bound receipts receive an invalidated event. Partners never receive evidence.
        </p>
      </ContentCard>
      <ContentCard title="Expiry scheduling">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          {RECEIPT_LIFECYCLE_SCHEDULING_POSTURE} receipt.expiring never implies the receipt is still valid.
        </p>
      </ContentCard>
      <ContentCard title="Partner workflow">
        <BulletList items={RECEIPT_LIFECYCLE_CHECKLIST.map((item) => `${item.title}. ${item.detail}`)} />
      </ContentCard>
      <PublicJourneyNextSteps title="Continue with Partner Event Delivery" />
    </RedesignPage>
  );
}
