// FILE: app/docs/action-control-plane/page.tsx
// Public docs for the Partner Action Control Plane.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  ACTION_AUTHORIZATION_CORE_RULES,
  ACTION_CONTROL_PLANE_CAPABILITY_META,
  ACTION_CONTROL_PLANE_CHECKLIST,
  ACTION_CONTROL_PLANE_GOOGLE,
  ACTION_CONTROL_PLANE_NOT_PARALLEL,
  ACTION_CONTROL_PLANE_PATH,
  ACTION_CONTROL_PLANE_PAYMENT_NOTICE,
  ACTION_CONTROL_PLANE_PRODUCTION,
  ACTION_CONTROL_PLANE_VENUE_NOTICE,
  ACTION_CONTROL_PLANE_WALLET_NOTICE,
  ACTION_CONTROL_PLANE_WEBHOOK_NOTICE,
} from "@/lib/partner/actionControlPlane/contract";

const FONT = ABRAXAS_FONT_SANS;
const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: 0,
};

export default function ActionControlPlaneDocsPage() {
  return (
    <RedesignPage accent="developer" maxWidth={900}>
      <PageHeader
        eyebrow="Developers · Partner Launchpad"
        title="Partner Action Control Plane"
        subtitle={ACTION_CONTROL_PLANE_NOT_PARALLEL}
      />

      <ContentCard title="What it operates">
        <p style={body}>
          Signed-in partners use Launchpad to see one sandbox app’s pinned policy, configured
          capabilities, readiness, and the next real setup step. Capabilities are Hosted Partner Flow,
          receipt verification, webhooks, trading venue access, payment authorization, and optional
          Wallet Standard binding.
        </p>
        <p style={{ ...body, marginTop: "0.65rem" }}>{ACTION_CONTROL_PLANE_GOOGLE}</p>
      </ContentCard>

      <ContentCard title="Action authorization stays generic">
        <p style={body}>
          Trading and payment stay named action contracts on the same core rules:
          {" "}
          {ACTION_AUTHORIZATION_CORE_RULES.join(", ")}.
        </p>
        <p style={{ ...body, marginTop: "0.65rem" }}>{ACTION_CONTROL_PLANE_VENUE_NOTICE}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{ACTION_CONTROL_PLANE_PAYMENT_NOTICE}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{ACTION_CONTROL_PLANE_WALLET_NOTICE}</p>
        <p style={{ ...body, marginTop: "0.5rem" }}>{ACTION_CONTROL_PLANE_WEBHOOK_NOTICE}</p>
      </ContentCard>

      <ContentCard title="Sandbox checklist">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          {ACTION_CONTROL_PLANE_CHECKLIST.map((id) => (
            <li key={id}>{id.replace(/_/g, " ")}</li>
          ))}
        </ul>
        <p style={{ ...body, marginTop: "0.75rem" }}>{ACTION_CONTROL_PLANE_PRODUCTION.notice}</p>
      </ContentCard>

      <ContentCard title="Where to continue">
        <ul style={{ ...body, paddingLeft: "1.2rem", display: "grid", gap: "0.4rem" }}>
          <li><Link href={ACTION_CONTROL_PLANE_PATH}>Open Partner Launchpad</Link></li>
          {Object.values(ACTION_CONTROL_PLANE_CAPABILITY_META).map((item) => (
            <li key={item.href}><Link href={item.href}>{item.label}</Link></li>
          ))}
        </ul>
      </ContentCard>
    </RedesignPage>
  );
}
