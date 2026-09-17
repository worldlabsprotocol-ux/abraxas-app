"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildReferencePartnerBrowseVerifyUrl } from "@/lib/demo/referencePartnerBrowse";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#38BDF8";

export function ReferencePartnerBrowseStart() {
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  useEffect(() => {
    setVerifyUrl(buildReferencePartnerBrowseVerifyUrl(window.location.origin));
  }, []);

  return (
    <main style={{ maxWidth: 680, margin: "3rem auto", padding: "0 1rem 3rem", fontFamily: FONT, color: "var(--text-primary)" }}>
      <p style={{ color: ACCENT, fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.1em", margin: "0 0 0.6rem" }}>
        DEMO · REFERENCE PARTNER
      </p>
      <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", lineHeight: 1.1, margin: "0 0 0.85rem" }}>
        Browse proof, without a purchase claim
      </h1>
      <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1.25rem" }}>
        This reference flow starts with an Abraxas account, requests a birthday self-attestation for browse access,
        and returns a signed L0 receipt. The resulting receipt is always <code>valid_for_purchase: false</code>.
      </p>

      <section style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface-raised)" }}>
        <ol style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.75, paddingLeft: "1.25rem", margin: 0 }}>
          <li>Create or open an Abraxas Passport with Google zkLogin.</li>
          <li>Submit a DOB self-attestation for the browse policy.</li>
          <li>Return here to validate the signed receipt.</li>
          <li>See why that receipt cannot authorize retail purchase.</li>
        </ol>
      </section>

      {verifyUrl ? (
        <a href={verifyUrl} style={{ display: "inline-block", marginTop: "1.25rem", padding: "0.75rem 1rem", borderRadius: 10, background: ACCENT, color: "#04111d", textDecoration: "none", fontWeight: 800, fontSize: "0.88rem" }}>
          Start browse verification →
        </a>
      ) : (
        <p style={{ marginTop: "1.25rem", color: "var(--text-secondary)" }}>Preparing verification…</p>
      )}

      <p style={{ color: "#fbbf24", fontSize: "0.8rem", lineHeight: 1.6, marginTop: "1rem" }}>
        This environment must be allowlisted for the Abraxas-controlled callback before the flow can complete.
      </p>
      <Link href="/docs/progressive-proof" style={{ color: ACCENT, fontSize: "0.84rem", fontWeight: 700 }}>Read the integration quickstart →</Link>
    </main>
  );
}
