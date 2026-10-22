import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Wallet-control sharing consent — server gate",
  robots: { index: false, follow: false },
};

export default function PartnerSharingConsentServerGatePage() {
  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1.25rem 4rem", lineHeight: 1.6 }}>
      <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
        <Link href="/founder-brand-review">← Founder brand review</Link>
      </p>
      <h1>Wallet-control sharing consent — server gate</h1>
      <p>
        Shipped on <code>main</code> via merge <code>c2cb6de4</code> (includes <code>a95cf637</code>). Repository doc:{" "}
        <code>docs/founder/partner-sharing-consent-server-gate.md</code>.
      </p>
      <h2>Proves</h2>
      <ul>
        <li>Authenticated browser session when consent is issued.</li>
        <li>Method qualification for exact partner / policy / verify_request before consent.</li>
        <li>Completion requires qualification plus matching signed cookie (session sub, bindings, ~15m TTL).</li>
      </ul>
      <h2>Does not prove</h2>
      <ul>
        <li>Independent human attestation (cookie ≠ proof of button click in isolation).</li>
        <li>Durable holder-consent record (best-effort audit; not a standalone consent receipt for this path).</li>
      </ul>
      <h2>Residual risks</h2>
      <p>Cookie replay within TTL, session refresh edge cases, audit durability, revocation coupling — track in staging E2E.</p>
      <h2>Production smoke (unauthenticated)</h2>
      <pre style={{ background: "#0f141c", padding: "1rem", borderRadius: 8, fontSize: "0.85rem" }}>
        {`POST /api/v1/partner-flow/complete → 401
POST /api/v1/partner-flow/sharing-consent → 401`}
      </pre>
    </main>
  );
}
