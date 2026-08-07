// FILE: app/examples/partner-access-starter/page.tsx
// Reference starter entry — "Continue with Abraxas" (server-built verify URL).

import Link from "next/link";
import {
  buildStarterVerifyUrl,
  resolveStarterConfig,
  STARTER_ENV_KEYS,
} from "@/examples/partner-access-nextjs-starter/lib/config";
import {
  STARTER_LABEL,
  STARTER_ROUTES,
} from "@/examples/partner-access-nextjs-starter/lib/constants";

export const dynamic = "force-dynamic";

export default function PartnerAccessStarterPage() {
  const resolved = resolveStarterConfig();

  if (!resolved.config || resolved.missing.length > 0) {
    return (
      <main style={{ fontFamily: "system-ui,sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
        <p style={{ color: "#b45309", fontSize: "0.875rem" }}>{STARTER_LABEL}</p>
        <h1>Partner Access Starter — not configured</h1>
        <p>Set operator env vars (see <code>examples/partner-access-nextjs-starter/.env.example</code>):</p>
        <ul>
          {resolved.missing.map((key) => (
            <li key={key}><code>{key}</code></li>
          ))}
          {!resolved.sessionSecret && <li><code>{STARTER_ENV_KEYS.sessionSecret}</code></li>}
        </ul>
      </main>
    );
  }

  if (resolved.returnUrlErrors.length > 0) {
    return (
      <main style={{ fontFamily: "system-ui,sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
        <p style={{ color: "#b45309", fontSize: "0.875rem" }}>{STARTER_LABEL}</p>
        <h1>Invalid return URL</h1>
        <p><code>{STARTER_ENV_KEYS.returnUrl}</code> failed validation:</p>
        <ul>
          {resolved.returnUrlErrors.map((err) => (
            <li key={err}><code>{err}</code></li>
          ))}
        </ul>
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
