"use client";

import { DecisionReceiptInspectionVisual } from "@/components/protocol-visuals";
import { HomeReceiptInspectionExhibit } from "@/components/home/premium/HomeReceiptInspectionExhibit";

/** Evidence chapter — inspection visual + live simulated receipt (minimal prose). */
export function HomeVerifiableTrustChapter() {
  return (
    <div className="abx-cinematic-trust-chapter abx-premium-trust">
      <DecisionReceiptInspectionVisual />
      <HomeReceiptInspectionExhibit />
    </div>
  );
}
