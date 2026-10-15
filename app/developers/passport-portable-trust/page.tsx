import { AbxPageShell } from "@/components/design/AbxPageShell";
import { AbxPageHeader } from "@/components/design/AbxPrimitives";
import { PassportPortableTrustDemoClient } from "./PassportPortableTrustDemoClient";

export default function PassportPortableTrustDemoPage() {
  return (
    <AbxPageShell>
      <AbxPageHeader
        eyebrow="Build #565"
        title="Passport portable trust"
        lead="Holder-controlled presentations and independent partner verification (synthetic demo)."
      />
      <PassportPortableTrustDemoClient />
    </AbxPageShell>
  );
}
