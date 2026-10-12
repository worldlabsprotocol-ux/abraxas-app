"use client";

import { LiveProtocolEvidence } from "@/components/institutional/LiveProtocolEvidence";
import { ProtocolIdentityExhibit } from "@/components/institutional/ProtocolIdentityExhibit";
import { TrustModelExhibit } from "@/components/institutional/TrustModelExhibit";
import { HomeReceiptInspectionExhibit } from "@/components/home/premium/HomeReceiptInspectionExhibit";
import { CINEMATIC_TRUST_CHAPTER_EYEBROW } from "@/lib/home/cinematicHomeCopy";

/** Chapter — technical vocabulary and live/simulated evidence. */
export function HomeVerifiableTrustChapter() {
  return (
    <div className="abx-cinematic-trust-chapter abx-premium-trust">
      <header className="abx-cinematic-trust-chapter__intro abx-premium-trust__intro">
        <p className="abx-v2-eyebrow">{CINEMATIC_TRUST_CHAPTER_EYEBROW}</p>
        <h2 className="abx-v2-section-title abx-premium-trust__title">Progressively disclosed proof</h2>
        <p className="abx-v2-section-lead">
          Explore signed receipts, expiration, revocation, and independent verification. Interactive examples are labeled;
          devnet observations are shown separately from marketing animation.
        </p>
      </header>

      <HomeReceiptInspectionExhibit />

      <TrustModelExhibit />
      <ProtocolIdentityExhibit />
      <LiveProtocolEvidence />
    </div>
  );
}
