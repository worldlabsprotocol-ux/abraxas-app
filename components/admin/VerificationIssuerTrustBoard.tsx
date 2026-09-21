"use client";
// FILE: components/admin/VerificationIssuerTrustBoard.tsx

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";
import { VERIFICATION_ISSUER_TRUST_NOTICE } from "@/lib/verification/issuerTrust/contract";

const FONT = "'Inter',system-ui,sans-serif";

interface TrustItem {
  issuer_ref: string;
  record_version: number;
  label: string;
  method_category: string;
  assurance_level: string;
  status_label: string;
  integration: string;
  holder_selectable: boolean;
  current: boolean;
  policy_applicable?: boolean;
  docs?: string;
}

export function VerificationIssuerTrustBoard() {
  const [items, setItems] = useState<TrustItem[]>([]);
  const [error, setError] = useState("");
  const [reclaim, setReclaim] = useState<{
    configuration_present?: boolean;
    integration_ready?: boolean;
    mapping_present?: boolean;
    docs?: string;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch("/api/admin/verification-issuer-trust", { cache: "no-store" });
    const data = await res.json() as { items?: TrustItem[]; error?: string; reclaim?: typeof reclaim };
    if (!res.ok) throw new Error(data.error ?? "Unavailable");
    setItems(data.items ?? []);
    setReclaim(data.reclaim ?? null);
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Unavailable"));
  }, [load]);

  return (
    <section aria-labelledby="issuer-trust-heading" style={{ marginTop: "1.5rem" }}>
      <h2 id="issuer-trust-heading" style={{ fontFamily: FONT, fontSize: "1.05rem", margin: "0 0 0.4rem" }}>
        Verification issuer trust
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "rgba(255,255,255,0.62)", lineHeight: 1.55, margin: 0 }}>
        {VERIFICATION_ISSUER_TRUST_NOTICE} Browser input cannot create or activate issuers.
      </p>
      {error && <p role="alert" style={{ fontFamily: FONT, color: "#f87171", fontSize: "0.8rem" }}>{error}</p>}
      {reclaim && (
        <p data-testid="reclaim-config-status" style={{ fontFamily: FONT, fontSize: "0.76rem", opacity: 0.8, margin: "0.75rem 0 0" }}>
          Reclaim private attestations: {reclaim.integration_ready ? "integration ready (sandbox mapping)" : "review required until configuration is present"}.
          {" "}Policy applicability is source-controlled. App secrets are never shown.
        </p>
      )}
      <div data-testid="issuer-trust-list" style={{ display: "grid", gap: "0.65rem", marginTop: "0.75rem", maxWidth: "100%" }}>
        {items.map((item) => (
          <article
            key={item.issuer_ref}
            aria-label={`Issuer ${item.label}`}
            style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "0.8rem" }}
          >
            <h3 style={{ fontFamily: FONT, fontSize: "0.9rem", margin: 0 }}>{item.label}</h3>
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", opacity: 0.72, margin: "0.3rem 0 0" }}>
              {item.issuer_ref} · v{item.record_version} · {item.status_label} · {item.integration}
              {item.current ? "" : " · not current"}
              {item.holder_selectable ? "" : " · not holder selectable"}
            </p>
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", margin: "0.25rem 0 0" }}>
              {item.method_category} · {item.assurance_level}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
