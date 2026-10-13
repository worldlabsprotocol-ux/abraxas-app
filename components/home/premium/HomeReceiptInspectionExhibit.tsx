"use client";

import { ProtocolReceiptDemo } from "@/components/institutional/ProtocolReceiptDemo";

const CHECKS = [
  { id: "issuer", label: "Issuer provenance", detail: "Trusted registry issuer ID on receipt" },
  { id: "sig", label: "Cryptographic signature", detail: "Ed25519 validity (simulated fixture)" },
  { id: "policy", label: "Policy scope", detail: "Single policy_id — no cross-policy reuse" },
  { id: "exp", label: "Expiration", detail: "Time-bound eligibility window" },
  { id: "rev", label: "Revocation", detail: "Simulate REVOKED → DENY independently of signature" },
  { id: "replay", label: "Replay protection", detail: "Verifier checks freshness + nonce (concept)" },
  { id: "indep", label: "Independent verification", detail: "Third party verifies without holder PII" },
] as const;

/** Signature C — frames the existing receipt demo with inspection checklist (no logic changes). */
export function HomeReceiptInspectionExhibit() {
  return (
    <div className="abx-premium-receipt-exhibit">
      <aside className="abx-premium-receipt-exhibit__checklist" aria-label="Receipt inspection dimensions">
        <p className="abx-premium-receipt-exhibit__checklist-title">What verifiers inspect</p>
        <ul className="abx-premium-receipt-exhibit__checks">
          {CHECKS.map((c) => (
            <li key={c.id}>
              <span className="abx-premium-receipt-exhibit__check-mark" aria-hidden="true">
                ◇
              </span>
              <div>
                <strong>{c.label}</strong>
                <span>{c.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <div className="abx-premium-receipt-exhibit__demo">
        <ProtocolReceiptDemo />
      </div>
    </div>
  );
}
