"use client";
// FILE: app/portal/status/page.tsx

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { OwnerPortalStatusPanel } from "@/components/portal/OwnerPortalStatusPanel";

const FONT = "'Inter',system-ui,sans-serif";

function StatusInner() {
  const params = useSearchParams();
  const applicationId = params.get("application_id") ?? params.get("id") ?? "";
  const email = params.get("email") ?? "";

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <Link href="/portal" style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)" }}>
        ← Owner portal
      </Link>
      <h1 style={{ fontFamily: FONT, fontSize: "1.35rem", fontWeight: 800, margin: "0.75rem 0 0.35rem" }}>
        Track your application
      </h1>
      <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
        Verify once · Abraxas owner portal
      </p>
      <OwnerPortalStatusPanel
        initialApplicationId={applicationId || undefined}
        initialEmail={email || undefined}
      />
    </div>
  );
}

export default function PortalStatusPage() {
  return (
    <RedesignPage maxWidth={720}>
      <Suspense fallback={null}>
        <StatusInner />
      </Suspense>
      <div style={{ maxWidth: 560, margin: "1.5rem auto 2rem" }}>
        <Link href="/portal/apply" style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#10B981", textDecoration: "none" }}>
          Start a new application →
        </Link>
      </div>
    </RedesignPage>
  );
}
