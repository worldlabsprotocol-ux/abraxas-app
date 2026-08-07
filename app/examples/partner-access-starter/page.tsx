// FILE: app/examples/partner-access-starter/page.tsx
// Reference starter entry — "Continue with Abraxas" (server-built verify URL).

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildStarterVerifyUrl,
} from "@/examples/partner-access-nextjs-starter/lib/config";
import {
  STARTER_LABEL,
  STARTER_ROUTES,
} from "@/examples/partner-access-nextjs-starter/lib/constants";
import { assessStarterRuntime } from "@/examples/partner-access-nextjs-starter/lib/runtimeGate";

export const dynamic = "force-dynamic";

export default function PartnerAccessStarterPage() {
  const runtime = assessStarterRuntime();

  if (!runtime.enabled) {
    notFound();
  }

  const resolved = runtime.config;

  if (!runtime.ready || !resolved.config) {
    return (
      <main style={{ fontFamily: "system-ui,sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
        <p style={{ color: "#b45309", fontSize: "0.875rem" }}>{STARTER_LABEL}</p>
        <h1>Partner Access Starter — not available</h1>
        <p>
          The starter is opted in but not fully configured. See{" "}
          <code>examples/partner-access-nextjs-starter/.env.example</code> for local setup.
        </p>
      </main>
    );
  }

  const verifyUrl = buildStarterVerifyUrl(resolved.config);

  return (
    <main style={{ fontFamily: "system-ui,sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <p style={{ color: "#b45309", fontSize: "0.875rem" }}>{STARTER_LABEL}</p>
      <h1>Partner Access Starter</h1>
      <p>
        Minimal relying-party flow: Abraxas eligibility receipt → server-side verification →
        signed HttpOnly session → protected page.
      </p>
      <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
        Partner: <code>{resolved.config.partnerId}</code> · Policy: <code>{resolved.config.policyId}</code>
      </p>
      <a
        href={verifyUrl}
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          padding: "0.75rem 1.25rem",
          background: "#10B981",
          color: "#fff",
          borderRadius: 8,
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Continue with Abraxas
      </a>
      <p style={{ marginTop: "2rem", fontSize: "0.875rem" }}>
        <Link href={STARTER_ROUTES.protected}>Protected page</Link> (requires verified session)
      </p>
    </main>
  );
}
