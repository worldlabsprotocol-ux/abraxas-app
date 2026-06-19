"use client";
// FILE: components/terminal/AssetGrid.tsx
// All four registered assets: AAS-1 Cielo, AAS-2 DeMarko, AAS-3 Chancellor, AAS-4 Smyrna.
// One canonical rendering. no duplicates.

import { M, S, G, A, B, W, BDR, CARD, TEAL, RED, IND } from "./tokens";
import { Label, Button, ScrollFade } from "./ui";
import { AssetGallery } from "./AssetGallery";
import type { BuyItem, PurchaseOption } from "./BuyNowModal";

interface AssetGridProps {
  onViewRegistry: () => void;
  onInvest: (assetId: string) => void;
  onBuyNow: (item: BuyItem) => void;
}

// ─── REAL PHOTO GALLERIES ──────────────────────────────────────────────
// Files live in /public/assets/{folder}/. Add filenames below to add more.

// Cielo Sunrise — 20 photos at /public/assets/cielo/01.jpg … 20.jpg
const CIELO_IMAGES: string[] = Array.from({ length: 20 }, (_, i) =>
  `/assets/cielo/${String(i + 1).padStart(2, "0")}.jpg`
);

// DeMarko Reddins book covers — 8 covers at /public/assets/demarko/001.jpg … 008.jpg
const DEMARKO_IMAGES: string[] = Array.from({ length: 8 }, (_, i) =>
  `/assets/demarko/${String(i + 1).padStart(3, "0")}.jpg`
);

// 14 Days in Beijing — 3 images at /public/assets/chancellor/0001.jpg … 0003.jpg
const CHANCELLOR_IMAGES: string[] = Array.from({ length: 3 }, (_, i) =>
  `/assets/chancellor/${String(i + 1).padStart(4, "0")}.jpg`
);

// Smyrna — real photos of the actual property, uploaded as 011.webp
// through 033.webp. If your actual filenames don't match this exact
// range, adjust the numbers below, everything else works unchanged.
const SMYRNA_IMAGES: string[] = Array.from({ length: 23 }, (_, i) =>
  `/assets/smyrna/${String(i + 11).padStart(3, "0")}.webp`
);

// ─── BUY NOW SELECTABLE OPTIONS ─────────────────────────────────────
// Generic, honest tiers since exact individual book titles aren't set
// yet. Replace the `label` fields below with real titles whenever
// ready, the picker UI and payment flow work unchanged either way.

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

const CIELO_STATS = [
  { k:"Appraised Value", v:"$1,100,000" },
  { k:"Annual NOI",      v:"$109,500" },
  { k:"Cash Yield",      v:"14.6%" },
  { k:"Collateral Score",v:"89 / 100" },
  { k:"Max Borrow",      v:"$660K USDC" },
  { k:"Cap Rate",        v:"9.95%" },
];

export function AssetGrid({ onViewRegistry, onInvest, onBuyNow }: AssetGridProps) {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      {/* AAS-1: Cielo Sunrise */}
      <ScrollFade>
      <Label>Featured Asset</Label>
      <div style={{ borderRadius:8, overflow:"hidden",
                     border:`1px solid ${G}35`, marginBottom:"1.5rem" }}>
        {CIELO_IMAGES.length > 0 ? (
          <div style={{ padding:"1rem 1rem 0" }}>
            <AssetGallery images={CIELO_IMAGES} fallbackLabel="Cielo Sunrise" color={G} />
          </div>
        ) : (
        <div style={{ height:"clamp(200px,35vw,300px)",
                       background:"linear-gradient(160deg,#0a1a0f 0%,#0d2318 25%,#112b1e 50%,#0a1a12 75%,#061008 100%)",
                       position:"relative", overflow:"hidden" }}>
          <svg viewBox="0 0 1200 320"
            style={{ position:"absolute", bottom:0, left:0,
                      width:"100%", height:"100%", opacity:0.6 }}
            preserveAspectRatio="none">
            <path d="M0,320 L0,200 L120,140 L200,160 L280,100 L380,130 L460,80 L540,110 L620,60 L700,90 L780,50 L860,80 L940,40 L1020,70 L1100,50 L1200,80 L1200,320 Z"
              fill="rgba(16,185,129,0.08)" />
            <path d="M0,320 L0,240 L100,190 L200,210 L300,160 L400,185 L500,140 L600,165 L700,120 L800,150 L900,110 L1000,140 L1100,120 L1200,140 L1200,320 Z"
              fill="rgba(16,185,129,0.12)" />
          </svg>
          <div style={{ position:"absolute", bottom:0, left:0, right:0,
                         background:"linear-gradient(transparent,rgba(4,6,8,0.95))",
                         padding:"2rem 1.25rem 1rem" }}>
            <div style={{ fontFamily:S, fontSize:"0.7rem", color:G, fontWeight:600,
                           marginBottom:4 }}>
              Verified · you can borrow against this
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1.1rem,3vw,1.6rem)",
                           fontWeight:700, color:W, lineHeight:1.2, marginBottom:4 }}>
              Cielo Sunrise
            </div>
            <div style={{ fontFamily:S, fontSize:"0.75rem",
                           color:"rgba(255,255,255,0.5)" }}>
              Private Mountain Wellness Retreat · Mineral Bluff, Georgia
            </div>
          </div>
          <div style={{ position:"absolute", top:12, right:12 }} />
        </div>
        )}
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
                       gap:"1px", background:BDR }}>
          {CIELO_STATS.map(s => (
            <div key={s.k} style={{ background:CARD, padding:"0.75rem 0.875rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.52rem",
                             color:"rgba(255,255,255,0.3)",
                             textTransform:"uppercase",
                             letterSpacing:"0.1em", marginBottom:3 }}>{s.k}</div>
              <div style={{ fontFamily:M, fontSize:"0.92rem",
                             fontWeight:900, color:G }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"0.875rem 1rem", background:"#08090F",
                       display:"flex", gap:"0.5rem", flexWrap:"wrap",
                       alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
            <Button onClick={onViewRegistry} variant="outline" color={G} size="md">
              VIEW ASSET RECORD
            </Button>
          </div>
          {/* Book Now — stablecoin booking. no investor positions open on Cielo currently */}
          <Button onClick={() => onBuyNow({
              id: "cielo-stay",
              name: "Cielo Sunrise · Book a Stay",
              price: "$597.50/night",
              description: "Book directly in USDC or USDT. Same property as the Airbnb listing, paid in stablecoin. Our team confirms your booking same day.",
              color: G,
            })} color={G} size="md">
            BOOK NOW
          </Button>
        </div>
      </div>
      </ScrollFade>

      {/* AAS-2 + AAS-3 + AAS-4 mini cards */}
      <ScrollFade delay={0.1}>
      <div style={{ display:"grid",
                     gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
                     gap:"0.75rem" }}>

        {/* AAS-2 DeMarko Reddins */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:`1px solid ${IND}50`,
                       background:"linear-gradient(145deg,#0C0E20 0%,#0A0C1A 100%)" }}>
          {DEMARKO_IMAGES.length > 0 ? (
            <div style={{ padding:"0.875rem 1rem 0" }}>
              <AssetGallery images={DEMARKO_IMAGES} fallbackLabel="DeMarko Reddins" color={IND} />
            </div>
          ) : (
            <div style={{ height:80, position:"relative", overflow:"hidden",
                           background:"linear-gradient(180deg,#131530 0%,#0A0C1A 100%)" }}>
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
                             background:"linear-gradient(transparent,rgba(10,12,26,0.9))" }} />
            </div>
          )}
          <div style={{ padding:"0.875rem 1rem",
                         borderBottom:`1px solid ${IND}20`,
                         background:`linear-gradient(135deg,rgba(99,102,241,0.12),rgba(0,0,0,0))` }}>
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
                       background:"linear-gradient(145deg,#140E00 0%,#0C0800 100%)",
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
                         background:`linear-gradient(135deg,${A}12,rgba(0,0,0,0))` }}>
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

        {/* AAS-4 Smyrna Townhome — Battery Atlanta area, 3x appreciation */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:`1px solid ${TEAL}55`,
                       background:"linear-gradient(145deg,#001820 0%,#000F16 100%)" }}>
          {/* Stock-style townhome visual. exact address kept private per privacy policy.
              Drop a real stock photo at /public/assets/smyrna/01.jpg and the
              AssetGallery will render it automatically without any further code. */}
          {SMYRNA_IMAGES.length > 0 ? (
            <div style={{ padding:"0.875rem 1rem 0" }}>
              <AssetGallery images={SMYRNA_IMAGES} fallbackLabel="Battery Atlanta area" color={TEAL} />
            </div>
          ) : (
          <div style={{ height:90, position:"relative", overflow:"hidden",
                         background:"linear-gradient(135deg,#001c2a 0%,#00141f 100%)" }}>
            <svg viewBox="0 0 500 90" preserveAspectRatio="none"
                 style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                          opacity:0.5 }}>
              {/* Townhome row silhouette */}
              <rect x="60"  y="22" width="70" height="68" fill={`${TEAL}18`} />
              <polygon points="60,22 95,2 130,22" fill={`${TEAL}25`} />
              <rect x="145" y="15" width="80" height="75" fill={`${TEAL}22`} />
              <polygon points="145,15 185,0 225,15" fill={`${TEAL}30`} />
              <rect x="240" y="28" width="65" height="62" fill={`${TEAL}16`} />
              <polygon points="240,28 272,10 304,28" fill={`${TEAL}22`} />
              <rect x="320" y="18" width="75" height="72" fill={`${TEAL}20`} />
              <polygon points="320,18 357,1 394,18" fill={`${TEAL}28`} />
              {/* Windows */}
              {[72,88,160,182,201,252,268,335,355,372].map(x => (
                <rect key={x} x={x} y="45" width="10" height="12" fill={`${TEAL}45`} />
              ))}
              {/* Doors */}
              {[85,175,259,348].map(x => (
                <rect key={x} x={x} y="70" width="12" height="20" fill={`${TEAL}35`} />
              ))}
            </svg>
            <div style={{ position:"absolute", inset:0,
                           background:"linear-gradient(transparent,rgba(0,15,22,0.95))" }} />
            <div style={{ position:"absolute", bottom:6, left:14,
                           fontFamily:S, fontSize:"0.56rem", fontWeight:600,
                           color:`${TEAL}70` }}>
              Smyrna, GA · Cumberland area · 6 min from Truist Park
            </div>
          </div>
          )}

          <div style={{ padding:"0.875rem 1rem",
                         borderBottom:`1px solid ${TEAL}20`,
                         background:`linear-gradient(135deg,${TEAL}12,rgba(0,0,0,0))` }}>
            <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                           color:TEAL, marginBottom:"0.375rem" }}>
              Real Estate · Battery Atlanta Area · Open to Investors
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1rem,2.5vw,1.25rem)",
                           fontWeight:700, color:W, marginBottom:"0.375rem" }}>
              Smyrna Townhome
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.45)", lineHeight:1.65 }}>
              Paid-off townhome sitting at 3x its original purchase price,
              six minutes from The Battery Atlanta. Owner is not selling
              and not refinancing through a traditional bank. Looking for
              a verified capital partner to unlock the equity — rental
              income or a structured note — while keeping long-term
              ownership as the Battery corridor continues to build.
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                         gap:"1px", background:BDR }}>
            {[
              { k:"Unit",          v:"1,220 sqft · 2BD/2BA" },
              { k:"Built",         v:"1984 · Condo/Townhouse" },
              { k:"Lien status",   v:"Clear · Paid off" },
              { k:"Appreciation",  v:"$76.2K \u2192 $228K+ (3x)" },
              { k:"Rent estimate", v:"$1,702 / month" },
              { k:"Location edge", v:"6 min · Truist Park" },
            ].map(s => (
              <div key={s.k} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.46rem",
                               color:"rgba(255,255,255,0.25)",
                               textTransform:"uppercase",
                               letterSpacing:"0.1em", marginBottom:2 }}>{s.k}</div>
                <div style={{ fontFamily:M, fontSize:"0.66rem",
                               fontWeight:700, color:TEAL }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                         display:"flex", gap:"0.5rem", alignItems:"center",
                         flexWrap:"wrap", justifyContent:"space-between" }}>
            <div style={{ fontFamily:S, fontSize:"0.58rem",
                           color:"rgba(255,255,255,0.3)", lineHeight:1.5,
                           maxWidth:160 }}>
              No bank route. Verified capital only. Long-term hold.
            </div>
            <Button onClick={() => onInvest("aas-4")} color={TEAL} size="sm">
              INVEST →
            </Button>
          </div>
        </div>
      </div>
      </ScrollFade>
    </div>
  );
}
