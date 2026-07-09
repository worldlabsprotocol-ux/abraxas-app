// FILE: app/demo/partner-access/page.tsx

export const dynamic = "force-dynamic";

import DemoPartnerClient from "./DemoPartnerClient";

export default function DemoPartnerAccessPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#060810" }}>
      <DemoPartnerClient />
    </div>
  );
}
