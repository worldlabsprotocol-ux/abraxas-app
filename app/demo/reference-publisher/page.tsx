// FILE: app/demo/reference-publisher/page.tsx
// Reference publisher — native publishing intent with provenance proof handoff.

import { ReferencePublisherClient } from "@/components/demo/referenceContentPublisher/ReferencePublisherClient";

export const dynamic = "force-dynamic";

export default function ReferencePublisherPage() {
  return <ReferencePublisherClient />;
}
