// FILE: app/examples/payment-authorization/page.tsx
// Public payment preflight reference. Checkout authorization only. No money movement.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { AbraxasPaymentAuthorizationAdapter, PAYMENT_REF_PARTNER_ID, PAYMENT_REF_POLICY_ID } from "@/lib/partner/paymentAuthorization";
import { PaymentAuthorizationExampleClient } from "@/app/examples/payment-authorization/PaymentAuthorizationExampleClient";

export const dynamic = "force-dynamic";

export default function PaymentAuthorizationExamplePage() {
  const adapter = new AbraxasPaymentAuthorizationAdapter({
    partnerId: PAYMENT_REF_PARTNER_ID,
    policyId: PAYMENT_REF_POLICY_ID,
    policyVersion: 1,
    environment: "sandbox",
  });
  const startUrl = adapter.startPolicyVerification("/examples/payment-authorization");

  return (
    <RedesignPage accent="developer" maxWidth={880}>
      <PageHeader
        eyebrow="Developers · Payment and commerce"
        title="Authorize checkout after a signed receipt"
        subtitle="A merchant asks Abraxas whether one sandbox payment action may proceed. This is not a checkout, processor, or transfer."
      />
      <PaymentAuthorizationExampleClient startUrl={startUrl} />
    </RedesignPage>
  );
}
