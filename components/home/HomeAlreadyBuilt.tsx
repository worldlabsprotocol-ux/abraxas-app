"use client";
// FILE: components/home/HomeAlreadyBuilt.tsx
// Verified production-capability list — no adoption or audit claims.

import {
  ALREADY_BUILT_CAPABILITIES,
  HOME_ALREADY_BUILT_HEADLINE,
  HOME_ALREADY_BUILT_LEAD,
} from "@/lib/home/commercialHomeContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeAlreadyBuilt() {
  return (
    <section
      aria-labelledby="home-already-built-heading"
      className="abx-home-section-center"
      style={{ width: "100%" }}
    >
      <div className="abx-home-intro">
        <h2 id="home-already-built-heading" className="abx-home-section-title" style={{ fontFamily: FONT }}>
          {HOME_ALREADY_BUILT_HEADLINE}
        </h2>
        <p className="abx-home-section-lead">{HOME_ALREADY_BUILT_LEAD}</p>
      </div>
      <ul className="abx-home-built-grid">
        {ALREADY_BUILT_CAPABILITIES.map((item) => (
          <li key={item} className="abx-home-built-item">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
