"use client";

import { DecisionReceiptVerificationInteractive } from "@/components/protocol-visuals/DecisionReceiptVerificationInteractive";
import {
  HOMEPAGE_EVIDENCE_KICKER,
  HOMEPAGE_EVIDENCE_TITLE,
  HOMEPAGE_EVIDENCE_TITLE_ACCENT,
} from "@/lib/home/homepagePlainCopy";
import { RECEIPT_DEMO_SHELL_CAPTION } from "@/lib/home/receiptDemoPublicCopy";

/** Evidence chapter — interactive receipt check (simulated fixtures). */
export function HomeVerifiableTrustChapter() {
  return (
    <div className="abx-cinematic-trust-chapter abx-premium-trust abx-premium-trust--focused">
      <DecisionReceiptVerificationInteractive
        shell={{
          kicker: HOMEPAGE_EVIDENCE_KICKER,
          title: HOMEPAGE_EVIDENCE_TITLE,
          titleAccent: HOMEPAGE_EVIDENCE_TITLE_ACCENT,
          caption: RECEIPT_DEMO_SHELL_CAPTION,
        }}
      />
    </div>
  );
}
