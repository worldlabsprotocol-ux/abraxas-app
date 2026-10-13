"use client";

import { ProtocolReceiptDemo } from "@/components/institutional/ProtocolReceiptDemo";

const CHECKS = [
  "Result",
  "Policy",
  "Issuer",
  "Signature",
  "Freshness",
  "Revocation",
  "Replay",
] as const;

/** Interactive receipt demo with compact inspection labels. */
export function HomeReceiptInspectionExhibit() {
  return (
    <div className="abx-premium-receipt-exhibit">
      <aside className="abx-premium-receipt-exhibit__checklist" aria-label="Receipt inspection dimensions">
        <p className="abx-premium-receipt-exhibit__checklist-title">Inspect</p>
        <ul className="abx-premium-receipt-exhibit__checks abx-premium-receipt-exhibit__checks--compact">
          {CHECKS.map((label) => (
            <li key={label}>
              <span className="abx-premium-receipt-exhibit__check-mark" aria-hidden="true">
                ◇
              </span>
              <strong>{label}</strong>
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
