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
        <p className="abx-v2-section-lead abx-premium-trust__plain-lead">
          First, see how a signed answer can be checked without exposing personal files. Deeper sections below use protocol
          terms — registry APIs, devnet labels, and simulated receipts — so you can inspect real engineering details when
          you are ready.
        </p>
      </header>

      <HomeReceiptInspectionExhibit />

      <TrustModelExhibit />
      <ProtocolIdentityExhibit />
      <LiveProtocolEvidence />
    </div>
  );
}
