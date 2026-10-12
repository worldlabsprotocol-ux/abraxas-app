"use client";

import Link from "next/link";
import {
  CAPABILITY_STATE_LABEL,
  PRODUCT_CAPABILITY_MATRIX,
  type CapabilityState,
} from "@/lib/home/capabilityMatrixData";

const STATE_CLASS: Record<CapabilityState, string> = {
  available: "abx-cap-matrix__state--available",
  pilot: "abx-cap-matrix__state--pilot",
  in_development: "abx-cap-matrix__state--dev",
  operator_review: "abx-cap-matrix__state--review",
  unavailable: "abx-cap-matrix__state--unavailable",
};

export function CapabilityMatrix() {
  return (
    <section className="abx-cap-matrix" id="capability-map" aria-labelledby="cap-matrix-heading">
      <p className="abx-v2-eyebrow">Product access</p>
      <h2 id="cap-matrix-heading" className="abx-v2-section-title">
        Capability matrix
      </h2>
      <p className="abx-v2-section-lead">
        States reflect implemented surfaces in this deployment. not roadmap fiction or customer counts.
      </p>

      <div className="abx-cap-matrix__wrap" role="region" aria-label="Capability matrix table">
        <div className="abx-cap-matrix__head" role="row">
          <span role="columnheader">Capability</span>
          <span role="columnheader">State</span>
          <span role="columnheader">Integration surface</span>
          <span role="columnheader">Evidence</span>
        </div>
        {PRODUCT_CAPABILITY_MATRIX.map((row) => (
          <div key={row.id} className="abx-cap-matrix__row" role="row">
            <span role="cell">{row.capability}</span>
            <span role="cell">
              <span className={`abx-cap-matrix__state ${STATE_CLASS[row.state]}`}>
                {CAPABILITY_STATE_LABEL[row.state]}
              </span>
            </span>
            <span role="cell" className="abx-cap-matrix__surface">
              {row.surface.startsWith("/") ? (
                <Link href={row.surface}>{row.surface}</Link>
              ) : (
                row.surface
              )}
            </span>
            <span role="cell">
              {row.evidenceHref ? (
                <Link href={row.evidenceHref} className="abx-cap-matrix__doc">
                  Documentation
                </Link>
              ) : (
                "N/A"
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
