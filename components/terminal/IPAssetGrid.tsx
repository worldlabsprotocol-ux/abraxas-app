"use client";
// FILE: components/terminal/IPAssetGrid.tsx
// IP assets (literary, entertainment), separated out from real estate
// so Music Royalty Audits can sit between the two clusters on the page.

import { M, S, A, W, BDR, CARD, IND } from "./tokens";
import { Button, ScrollFade } from "./ui";
import { AssetGallery } from "./AssetGallery";
import type { BuyItem, PurchaseOption } from "./BuyNowModal";

// DeMarko Reddins book covers, 8 covers at /public/assets/demarko/001.jpg … 008.jpg
const DEMARKO_IMAGES: string[] = Array.from({ length: 8 }, (_, i) =>
  `/assets/demarko/${String(i + 1).padStart(3, "0")}.jpg`
);

// 14 Days in Beijing, 3 images at /public/assets/chancellor/0001.jpg … 0003.jpg
const CHANCELLOR_IMAGES: string[] = Array.from({ length: 3 }, (_, i) =>
  `/assets/chancellor/${String(i + 1).padStart(4, "0")}.jpg`
);

const DEMARKO_OPTIONS: PurchaseOption[] = [
  {
    id: "demarko-ebook-single",
    label: "Any single ebook title",
    price: "$1.99",
    description: "Instant digital access to one title from the catalog. Tell us which title by email after payment.",
  },
  {
    id: "demarko-print-bundle",
    label: "Full print catalog bundle",
    price: "$14.99",
    description: "Physical copies of the full current catalog, shipped after payment confirms.",
  },
];

const CHANCELLOR_OPTIONS: PurchaseOption[] = [
  {
    id: "chancellor-script-access",
    label: "Script & Treatment Access",
    price: "$1.99",
    description: "Digital access to the current TV pilot script and anime series treatment for 14 Days in Beijing.",
  },
];

interface IPAssetGridProps {
  onInvest: (assetId: string) => void;
  onBuyNow: (item: BuyItem) => void;
}

export function IPAssetGrid({ onInvest, onBuyNow }: IPAssetGridProps) {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                     marginBottom:"0.875rem" }}>
        <div style={{ width:28, height:28, borderRadius:6, background:`${A}15`,
                       display:"flex", alignItems:"center", justifyContent:"center",
                       fontSize:"0.95rem", color:A }}>
          ◆
        </div>
        <span style={{ fontFamily:M, fontSize:"0.78rem", fontWeight:900,
                        color:A, letterSpacing:"0.08em", textTransform:"uppercase" }}>
          Literary &amp; Entertainment IP
        </span>
      </div>
      <ScrollFade>
      <div style={{ display:"grid",
                     gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
                     gap:"0.75rem" }}>

        {/* AAS-2 DeMarko Reddins */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:`1px solid ${IND}50`,
                       background:"#0C0E20" }}>
          {DEMARKO_IMAGES.length > 0 ? (
            <div style={{ padding:"0.875rem 1rem 0" }}>
              <AssetGallery images={DEMARKO_IMAGES} fallbackLabel="DeMarko Reddins" color={IND} />
            </div>
          ) : (
            <div style={{ height:80, position:"relative", overflow:"hidden",
                           background:"#131530" }}>
              {/* Original illustration. book-spine motif, no real cover art
                  since that's the author's own copyrighted work and needs
                  to come from a real upload, not be fabricated here */}
              <svg viewBox="0 0 400 80" preserveAspectRatio="none"
                   style={{ position:"absolute", bottom:0, left:0,
                            width:"100%", height:"100%", opacity:0.6 }}>
                <rect x="30"  y="10" width="26" height="70" fill={`${IND}25`} />
                <rect x="60"  y="20" width="22" height="60" fill={`${IND}35`} />
                <rect x="86"  y="5"  width="30" height="75" fill={`${IND}20`} />
                <rect x="120" y="15" width="24" height="65" fill={`${IND}30`} />
                <rect x="280" y="18" width="24" height="62" fill={`${IND}28`} />
                <rect x="308" y="8"  width="28" height="72" fill={`${IND}22`} />
                <rect x="340" y="22" width="20" height="58" fill={`${IND}32`} />
              </svg>
              <div style={{ position:"absolute", inset:0,
                             background:"rgba(10,12,26,0.9)" }} />
            </div>
          )}
          <div style={{ padding:"0.875rem 1rem",
                         borderBottom:`1px solid ${IND}20`,
                         background:`rgba(99,102,241,0.12)` }}>
            <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                           color:IND, marginBottom:"0.375rem" }}>
              Published Author · Book Royalties
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1rem,2.5vw,1.25rem)",
                           fontWeight:700, color:W, marginBottom:"0.25rem" }}>
              DeMarko Reddins
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.55 }}>
              Published author catalog · KDP royalty streams · Multi-title publishing rights
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                         gap:"1px", background:BDR }}>
            {[
              { k:"Asset Class", v:"Literary IP" },
              { k:"Revenue",     v:"KDP + Distributors" },
              { k:"Rights",      v:"Publishing / Royalties" },
              { k:"Status",      v:"PENDING VERIFICATION" },
            ].map(s => (
              <div key={s.k} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.48rem",
                               color:"rgba(255,255,255,0.25)",
                               textTransform:"uppercase",
                               letterSpacing:"0.1em", marginBottom:2 }}>{s.k}</div>
                <div style={{ fontFamily:M, fontSize:"0.68rem",
                               fontWeight:700, color:IND }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                         display:"flex", gap:"0.5rem", alignItems:"center",
                         justifyContent:"space-between", flexWrap:"wrap" }}>
            <Button href="https://www.amazon.com/stores/DeMarko-Reddins/author/B00JUA0U0G"
                    variant="outline" color={IND} size="sm">
              VIEW CATALOG
            </Button>
            <div style={{ display:"flex", gap:"0.5rem" }}>
              <Button onClick={() => onBuyNow({
                  id: "demarko-books",
                  name: "DeMarko Reddins · Book Catalog",
                  price: "From $1.99",
                  description: "Choose what you'd like below. Buy directly with USDC or USDT.",
                  color: IND,
                  options: DEMARKO_OPTIONS,
                })} variant="outline" color={IND} size="sm">
                BUY NOW
              </Button>
              <Button onClick={() => onInvest("aas-2")} color={IND} size="sm">
                INVEST →
              </Button>
            </div>
          </div>
        </div>

        {/* AAS-3 Chancellor K. Jackson. 14 Days in Beijing */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:`1px solid ${A}55`,
                       background:"#140E00",
                       gridColumn:"span 1" }}>
          {/* Real photos from /public/assets/chancellor/ */}
          <div style={{ padding:"0.875rem 0.875rem 0" }}>
            <AssetGallery images={CHANCELLOR_IMAGES}
                          fallbackLabel="14 Days in Beijing"
                          color={A} />
          </div>

          {/* Billboard header */}
          <div style={{ padding:"1rem 1rem 0.75rem",
                         borderBottom:`1px solid ${A}20`,
                         background:`${A}12` }}>
            <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                           color:A, marginBottom:"0.375rem" }}>
              By Chancellor K. Jackson · TV & Anime Project
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1.2rem,3vw,1.6rem)",
                           fontWeight:700, color:W, lineHeight:1.1,
                           marginBottom:"0.25rem" }}>
              14 Days in Beijing
            </div>
            <div style={{ fontFamily:S, fontSize:"0.68rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.5,
                           marginBottom:"0.625rem" }}>
              Completed scripts across multiple formats.
              Series acquisition discussions active with production partners.
            </div>

            {/* Script inventory */}
            <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem",
                           marginBottom:"0.625rem" }}>
              {[
                { label:"TV Pilot. Live Action", detail:"13 episodes · 1 hour per episode · Script complete", color:"#F97316" },
                { label:"Anime Series", detail:"17 episodes · 25 minutes per episode · Script complete", color:"#EC4899" },
              ].map(s => (
                <div key={s.label}
                  style={{ padding:"0.4rem 0.625rem", borderRadius:4,
                            background:`${s.color}08`,
                            border:`1px solid ${s.color}25`,
                            display:"flex", justifyContent:"space-between",
                            alignItems:"center", gap:"0.5rem" }}>
                  <div>
                    <div style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                                   color:s.color, letterSpacing:"0.06em" }}>
                      {s.label}
                    </div>
                    <div style={{ fontFamily:S, fontSize:"0.6rem",
                                   color:"rgba(255,255,255,0.35)" }}>
                      {s.detail}
                    </div>
                  </div>
                  <div style={{ padding:"0.15rem 0.4rem", borderRadius:2,
                                 background:`${s.color}15`,
                                 border:`1px solid ${s.color}30`,
                                 fontFamily:M, fontSize:"0.44rem", fontWeight:700,
                                 color:s.color, letterSpacing:"0.06em",
                                 flexShrink:0, whiteSpace:"nowrap" }}>
                    COMPLETE
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Animated production roadmap */}
          <div style={{ padding:"0.625rem 0.875rem",
                         background:"rgba(245,158,11,0.04)",
                         borderBottom:`1px solid rgba(245,158,11,0.1)` }}>
            <div style={{ fontFamily:M, fontSize:"0.48rem", color:`${A}60`,
                           letterSpacing:"0.12em", textTransform:"uppercase",
                           marginBottom:"0.5rem" }}>
              PRODUCTION ROADMAP
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:0,
                           overflowX:"auto", paddingBottom:"0.25rem" }}>
              {[
                { label:"Script",        status:"done",    color:A },
                { label:"Pilot",         status:"active",  color:"#F97316" },
                { label:"Acquisition",   status:"active",  color:"#F97316" },
                { label:"Animation",     status:"active",  color:"#EC4899" },
                { label:"Live Play",     status:"pending", color:"#8B5CF6" },
                { label:"Distribution",  status:"pending", color:"#3B82F6" },
              ].map((step, i, arr) => (
                <div key={step.label}
                  style={{ display:"flex", alignItems:"center", gap:0,
                            flexShrink:0 }}>
                  <div style={{ display:"flex", flexDirection:"column",
                                 alignItems:"center", gap:"0.2rem" }}>
                    {/* Animated dot */}
                    <div style={{ position:"relative", width:10, height:10 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%",
                                     background: step.status === "done"
                                       ? step.color
                                       : step.status === "active"
                                         ? `${step.color}40`
                                         : "rgba(255,255,255,0.1)",
                                     border: `1.5px solid ${step.status === "pending" ? "rgba(255,255,255,0.15)" : step.color}`,
                                     boxShadow: step.status === "active"
                                       ? `0 0 0 3px ${step.color}20`
                                       : step.status === "done"
                                         ? `0 0 6px ${step.color}60`
                                         : "none",
                                     position:"relative",
                                     animation: step.status === "active"
                                       ? "pulse-dot 1.8s ease-in-out infinite"
                                       : "none" }}/>
                    </div>
                    <div style={{ fontFamily:M, fontSize:"0.42rem",
                                   color: step.status === "pending"
                                     ? "rgba(255,255,255,0.2)"
                                     : step.color,
                                   letterSpacing:"0.04em",
                                   textAlign:"center", whiteSpace:"nowrap" }}>
                      {step.label}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width:18, height:1, flexShrink:0,
                                   background: i < 2
                                     ? `${A}40`
                                     : "rgba(255,255,255,0.08)",
                                   margin:"0 0 1rem" }} />
                  )}
                </div>
              ))}
            </div>
            <style>{`
              @keyframes pulse-dot {
                0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0.4)}
                50%{box-shadow:0 0 0 5px rgba(249,115,22,0)}
              }
            `}</style>
          </div>

          {/* CTA row */}
          <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                         display:"flex", gap:"0.5rem", alignItems:"center",
                         flexWrap:"wrap", justifyContent:"space-between" }}>
            <Button href="https://www.amazon.com/stores/Chancellor-K.-Jackson/author/B086YGY4BM"
                    variant="outline" color={A} size="sm">
              VIEW CATALOG
            </Button>
            <div style={{ display:"flex", gap:"0.5rem" }}>
              <Button onClick={() => onBuyNow({
                  id: "chancellor-project",
                  name: "14 Days in Beijing",
                  price: "From $1.99",
                  description: "Get digital access to current project materials. Paid in stablecoin.",
                  color: A,
                  options: CHANCELLOR_OPTIONS,
                })} variant="outline" color={A} size="sm">
                BUY NOW
              </Button>
              <Button onClick={() => onInvest("aas-3")} color={A} size="sm">
                INVEST →
              </Button>
            </div>
          </div>
        </div>
      </div>
      </ScrollFade>
    </div>
  );
}
