// FILE: app/examples/partner-access-starter/protected/page.tsx
// Protected example page — shown only after valid server-verified session.

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveStarterConfig } from "@/examples/partner-access-nextjs-starter/lib/config";
import {
  STARTER_LABEL,
  STARTER_ROUTES,
} from "@/examples/partner-access-nextjs-starter/lib/constants";
import {
  isStarterSessionActive,
  STARTER_SESSION_COOKIE,
  verifyStarterSession,
} from "@/examples/partner-access-nextjs-starter/lib/session";

export const dynamic = "force-dynamic";

export default function ProtectedStarterPage() {
  const resolved = resolveStarterConfig();
  const token = cookies().get(STARTER_SESSION_COOKIE)?.value;

  if (!resolved.sessionSecret || !token) {
    redirect(`${STARTER_ROUTES.entry}?reason=session_required`);
  }

  const session = verifyStarterSession(token, resolved.sessionSecret);
  if (!session || !isStarterSessionActive(session)) {
    redirect(`${STARTER_ROUTES.entry}?reason=session_expired`);
  }

  if (
    resolved.config
    && (session.partnerId !== resolved.config.partnerId
      || session.policyId !== resolved.config.policyId)
  ) {
    redirect(`${STARTER_ROUTES.entry}?reason=session_mismatch`);
  }

  return (
    <main style={{ fontFamily: "system-ui,sans-serif", maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <p style={{ color: "#b45309", fontSize: "0.875rem" }}>{STARTER_LABEL}</p>
      <h1>Protected resource</h1>
      <p>Access granted after Abraxas eligibility receipt was verified server-side.</p>
      <dl style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
        <dt>Partner</dt>
        <dd><code>{session.partnerId}</code></dd>
        <dt>Policy</dt>
        <dd><code>{session.policyId}</code></dd>
        <dt>Receipt</dt>
        <dd><code>{session.receiptId}</code></dd>
        <dt>Session expires</dt>
        <dd><code>{session.expiresAt}</code></dd>
      </dl>
      <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "#64748b" }}>
        No identity claims, email, wallet, JWT, or documents are stored in the browser or returned here.
      </p>
      <p style={{ marginTop: "1rem" }}>
        <Link href={STARTER_ROUTES.entry}>← Back to entry</Link>
      </p>
    </main>
  );
}
