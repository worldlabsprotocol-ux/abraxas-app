"use client";

import { DecisionReceiptInspectionVisual } from "@/components/protocol-visuals";
import { HomeReceiptInspectionExhibit } from "@/components/home/premium/HomeReceiptInspectionExhibit";

/** Evidence chapter — inspection visual + interactive receipt workbench. */
export function HomeVerifiableTrustChapter() {
  return (
    <div className="abx-cinematic-trust-chapter abx-premium-trust abx-premium-trust--split">
      <DecisionReceiptInspectionVisual />
      <div className="abx-premium-trust__workbench">
        <HomeReceiptInspectionExhibit />
      </div>
    </div>
  );
}
