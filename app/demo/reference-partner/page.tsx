import { ReferencePartnerBrowseStart } from "@/components/demo/ReferencePartnerBrowseStart";

// The host-specific callback must be configured on DEMO before this flow can redirect.
export const dynamic = "force-dynamic";

export default function ReferencePartnerPage() {
  return (
    <div data-theme="dark" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <ReferencePartnerBrowseStart />
    </div>
  );
}
