"use client";
// FILE: components/terminal/CloveCaseStudy.tsx
// The single flagship trust story, shown completely here, the full
// gallery, the construction journey, all the real numbers, not a
// preview that gets repeated again later. AssetGrid's real estate
// cluster links back here instead of duplicating it.

import { S, G, W, M, BDR, CARD } from "./tokens";
import { ScrollFade } from "./ui";
import { AssetGallery } from "./AssetGallery";
import { BluPearlConstruction } from "./BluPearlConstruction";

const CLOVE_IMAGES = [
  "/assets/worldwearables/theclove.webp",
  "/assets/worldwearables/theclove2.webp",
  "/assets/worldwearables/theclove3.png",
  "/assets/worldwearables/theclove4.png",
];

export function CloveCaseStudy() {
  return (
    <ScrollFade>
      <div>
        <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                       color:G, marginBottom:"0.625rem" }}>
          One real example, in full
        </div>

        {/* BEFORE / AFTER */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
                       gap:"1.25rem", marginBottom:"1.25rem" }}>
          <div style={{ padding:"1.25rem", borderRadius:12,
                         border:`1px solid ${BDR}`, background:"rgba(255,255,255,0.02)" }}>
            <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700,
                           color:"rgba(21,21,26,0.4)", letterSpacing:"0.06em",
                           textTransform:"uppercase", marginBottom:"0.75rem" }}>
              Without Abraxas
            </div>
            <ul style={{ margin:0, padding:0, listStyle:"none",
                          display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {["A listing, some photos, a claim", "\"Trust me, I own it\"",
                "No way to check what's actually verified",
                "You decide based on someone's word"].map(line => (
                <li key={line} style={{ fontFamily:S, fontSize:"0.8rem",
                                          color:"rgba(21,21,26,0.5)",
                                          display:"flex", gap:"0.5rem" }}>
                  <span style={{ color:"#EF4444" }}>✕</span>{line}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ padding:"1.25rem", borderRadius:12,
                         border:`1px solid ${G}40`,
                         background:"rgba(16,185,129,0.08)" }}>
            <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700,
                           color:G, letterSpacing:"0.06em",
                           textTransform:"uppercase", marginBottom:"0.75rem" }}>
              On Abraxas
            </div>
            <ul style={{ margin:0, padding:0, listStyle:"none",
                          display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {["Real photos, a real construction timeline",
                "Purchase date, ownership status, on record",
                "What's verified marked clearly, what isn't too",
                "You decide based on actual evidence"].map(line => (
                <li key={line} style={{ fontFamily:S, fontSize:"0.8rem",
                                          color:"rgba(21,21,26,0.7)",
                                          display:"flex", gap:"0.5rem" }}>
                  <span style={{ color:G }}>✓</span>{line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* THE FULL ASSET, complete, not a preview */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:"1px solid #06B6D455",
                       background:"#021c1f" }}>
          <div style={{ padding:"0.875rem 1rem 0" }}>
            <AssetGallery images={CLOVE_IMAGES} fallbackLabel="The Clove" color="#06B6D4" />
          </div>
          <div style={{ padding:"0.875rem 1rem",
                         borderBottom:"1px solid #06B6D420",
                         background:"rgba(6,182,212,0.12)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                           marginBottom:"0.375rem", flexWrap:"wrap" }}>
              <span style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600, color:"#06B6D4" }}>
                Real Estate · Zanzibar · Track Record
              </span>
              <span style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                              color:"#06B6D4", background:"#06B6D418",
                              padding:"0.1rem 0.5rem", borderRadius:10, letterSpacing:"0.06em" }}>
                SOLD OUT
              </span>
            </div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:"clamp(1rem,2.5vw,1.25rem)",
                           fontWeight:700, color:W, marginBottom:"0.375rem" }}>
              The Clove
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(21,21,26,0.45)", lineHeight:1.65 }}>
              A 2-bedroom villa in the Blu Pearl development, purchased in
              2023, since sold out. Not a pitch deck, an actual asset with
              an actual paper trail, shown here as proof of a completed
              cycle, not an open offering.
            </div>
            <BluPearlConstruction />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                         gap:"1px", background:BDR }}>
            {[
              { k:"Land / Build",   v:"179m² / 149m²" },
              { k:"Purchased",      v:"2023" },
              { k:"Amenities",      v:"Pool, solar A/C, rainwater" },
              { k:"Status",         v:"Sold out" },
              { k:"Ref. nightly rate", v:"$232 (developer-published)" },
              { k:"Ref. ROI range", v:"23.8% to 32% (developer projection)" },
            ].map(s => (
              <div key={s.k} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.46rem", color:"rgba(21,21,26,0.25)",
                               textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>
                  {s.k}
                </div>
                <div style={{ fontFamily:M, fontSize:"0.66rem", fontWeight:700, color:"#06B6D4" }}>
                  {s.v}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:"0.625rem 0.875rem", background:"#F4F4F1" }}>
            <div style={{ fontFamily:S, fontSize:"0.58rem", color:"rgba(21,21,26,0.3)", lineHeight:1.5 }}>
              ROI figures are the development's own published projections
              at the time of purchase, not independently verified by
              Abraxas. Shown as reference, not a guarantee.
            </div>
          </div>
        </div>
      </div>
    </ScrollFade>
  );
}
