import { ReferencePartnerBrowseStart } from "@/components/demo/ReferencePartnerBrowseStart";

export const dynamic = "force-dynamic";

export default function ReferencePartnerPage() {
  return (
    <div data-theme="dark" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <ReferencePartnerBrowseStart />
    </div>
  );
}
