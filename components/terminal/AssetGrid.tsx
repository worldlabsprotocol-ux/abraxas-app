"use client";
// FILE: components/terminal/AssetGrid.tsx
// All four registered assets: AAS-1 Cielo, AAS-2 DeMarko, AAS-3 Chancellor, AAS-4 Smyrna.
// One canonical rendering. no duplicates.

import { motion } from "framer-motion";
import { M, S, G, A, B, W, BDR, CARD, TEAL, RED, IND } from "./tokens";
import { Label, Button, ScrollFade } from "./ui";
import { AssetGallery } from "./AssetGallery";
import type { BuyItem } from "./BuyNowModal";
import { AnimatedCounter } from "@/lib/motion/AnimatedCounter";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

interface AssetGridProps {
  onViewRegistry: () => void;
  onViewFlagship: () => void;
  onInvest: (assetId: string) => void;
  onBuyNow: (item: BuyItem) => void;
}

// REAL PHOTO GALLERIES
// Files live in /public/assets/{folder}/. Add filenames below to add more.

// Cielo Sunrise, 20 photos at /public/assets/cielo/01.jpg … 20.jpg
const CIELO_IMAGES: string[] = Array.from({ length: 20 }, (_, i) =>
  `/assets/cielo/${String(i + 1).padStart(2, "0")}.jpg`
);

// Smyrna, real photos of the actual property, uploaded as 011.webp
// through 033.webp. If your actual filenames don't match this exact
// range, adjust the numbers below, everything else works unchanged.
const SMYRNA_IMAGES: string[] = Array.from({ length: 23 }, (_, i) =>
  `/assets/smyrna/${String(i + 11).padStart(3, "0")}.webp`
);

// Naj Tulum, a unit at a condo-hotel in Aldea Zama, Tulum, Mexico,
// purchased 2023, owned outright. Four photos, naj.jpg through naj4.jpg.
const NAJ_TULUM_IMAGES: string[] = [
  "/assets/worldwearables/naj.jpg",
  "/assets/worldwearables/naj2.jpg",
  "/assets/worldwearables/naj3.jpg",
  "/assets/worldwearables/naj4.jpg",
];

// BUY NOW SELECTABLE OPTIONS
// Generic, honest tiers since exact individual book titles aren't set
// yet. Replace the `label` fields below with real titles whenever
// ready, the picker UI and payment flow work unchanged either way.

const CIELO_STATS = [
  { k:"Appraised Value", v:"$1,100,000" },
  { k:"Yearly Profit",   v:"$109,500" },
  { k:"Cash Yield",      v:"14.6%" },
  { k:"Lending Score",v:"96 / 100" },
  { k:"Max Borrow",      v:"$660K USDC" },
  { k:"Yearly Return Rate", v:"9.95%" },
];

// Marketplace simplified to two flagship assets for now (Cielo, The
// Clove). Smyrna and Naj Tulum stay fully built, just not rendered,
// flip this back to true to bring them back without rebuilding anything.
const SHOW_ADDITIONAL_REAL_ESTATE = false;

export function AssetGrid({ onViewRegistry, onViewFlagship, onInvest, onBuyNow }: AssetGridProps) {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      {/* AAS-1: Cielo Sunrise */}
      <ScrollFade>
      <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                     marginBottom:"0.625rem" }}>
        <div style={{ width:28, height:28, borderRadius:6, background:`${G}15`,
                       display:"flex", alignItems:"center", justifyContent:"center",
                       fontSize:"0.95rem", color:G }}>
          ⌂
        </div>
        <span style={{ fontFamily:M, fontSize:"0.78rem", fontWeight:900,
                        color:G, letterSpacing:"0.08em", textTransform:"uppercase" }}>
          Real Estate
        </span>
      </div>
      <Label>Featured Asset</Label>
      <div style={{ borderRadius:20, overflow:"hidden",
                     border:`1px solid ${G}40`, marginBottom:"1.5rem",
                     boxShadow:"var(--shadow-glow)", background:"var(--surface-raised)" }}>
        {CIELO_IMAGES.length > 0 ? (
          <div style={{ padding:"1rem 1rem 0" }}>
            <AssetGallery images={CIELO_IMAGES} fallbackLabel="Cielo Sunrise" color={G} />
          </div>
        ) : (
        <div style={{ height:"clamp(200px,35vw,300px)",
                       background:"#0a1a0f",
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
                         background:"rgba(4,6,8,0.95)",
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
                           color:"rgba(21,21,26,0.5)" }}>
              Private Mountain Wellness Retreat · Mineral Bluff, Georgia
            </div>
          </div>
          <div style={{ position:"absolute", top:12, right:12 }} />
        </div>
        )}
        <motion.div
          variants={staggerContainer(0.08, 0.05)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
                       gap:"1px", background:BDR }}>
          {CIELO_STATS.map(s => (
            <motion.div key={s.k} variants={staggerItem}
              whileHover={{ background:"var(--surface-raised)" }}
              style={{ background:CARD, padding:"0.75rem 0.875rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.52rem",
                             color:"rgba(21,21,26,0.3)",
                             textTransform:"uppercase",
                             letterSpacing:"0.1em", marginBottom:3 }}>{s.k}</div>
              <div style={{ fontFamily:M, fontSize:"0.92rem",
                             fontWeight:900, color:G }}>
                <AnimatedCounter value={s.v} />
              </div>
            </motion.div>
          ))}
        </motion.div>
        <div style={{ padding:"0.875rem 1rem", background:"var(--surface-raised)",
                       display:"flex", gap:"0.5rem", flexWrap:"wrap",
                       alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
            <Button onClick={onViewFlagship} color={G} size="md">
              VIEW FULL PROFILE
            </Button>
            <Button onClick={onViewRegistry} variant="outline" color={G} size="md">
              VIEW ASSET RECORD
            </Button>
          </div>
          {/* Book Now, stablecoin booking. no investor positions open on Cielo currently */}
          <Button onClick={() => onBuyNow({
              id: "cielo-stay",
              name: "Cielo Sunrise · Book a Stay",
              price: "$597.50/night",
              description: "Book directly in USDC or USDT. Same property as the Airbnb listing, paid in stablecoin. Our team confirms your booking same day.",
              color: G,
              requiresDates: true,
            })} color={G} size="md">
            BOOK NOW
          </Button>
          <a href="https://www.airbnb.com/rooms/1681387746169197852"
             target="_blank" rel="noopener noreferrer"
             style={{ display:"inline-block", marginLeft:"0.5rem",
                       padding:"0.45rem 0.875rem", borderRadius:6,
                       border:`1px solid ${BDR}`, color:"rgba(21,21,26,0.4)",
                       fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                       textDecoration:"none" }}>
            Or book on Airbnb →
          </a>
        </div>
      </div>
      </ScrollFade>

      {/* AAS-4, AAS-5, real estate mini cards */}
      <ScrollFade delay={0.1}>
      {SHOW_ADDITIONAL_REAL_ESTATE && (
      <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                     margin:"1.75rem 0 0.875rem" }}>
        <div style={{ flex:1, height:1, background:BDR }} />
        <span style={{ fontFamily:M, fontSize:"0.7rem", fontWeight:700,
                        color:"rgba(21,21,26,0.35)", letterSpacing:"0.1em",
                        textTransform:"uppercase" }}>
          More Asset Classes
        </span>
        <div style={{ flex:1, height:1, background:BDR }} />
      </div>
      )}
      <div style={{ display:"grid",
                     gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
                     gap:"0.75rem" }}>

        {SHOW_ADDITIONAL_REAL_ESTATE && (<>
        {/* AAS-4 Smyrna Townhome, Battery Atlanta area, 3x appreciation */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:`1px solid ${TEAL}55`,
                       background:"#001820" }}>
          {/* Stock-style townhome visual. exact address kept private per privacy policy.
              Drop a real stock photo at /public/assets/smyrna/01.jpg and the
              AssetGallery will render it automatically without any further code. */}
          {SMYRNA_IMAGES.length > 0 ? (
            <div style={{ padding:"0.875rem 1rem 0" }}>
              <AssetGallery images={SMYRNA_IMAGES} fallbackLabel="Battery Atlanta area" color={TEAL} />
            </div>
          ) : (
          <div style={{ height:90, position:"relative", overflow:"hidden",
                         background:"#001c2a" }}>
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
                           background:"rgba(0,15,22,0.95)" }} />
            <div style={{ position:"absolute", bottom:6, left:14,
                           fontFamily:S, fontSize:"0.56rem", fontWeight:600,
                           color:`${TEAL}70` }}>
              Smyrna, GA · Cumberland area · 6 min from Truist Park
            </div>
          </div>
          )}

          <div style={{ padding:"0.875rem 1rem",
                         borderBottom:`1px solid ${TEAL}20`,
                         background:`${TEAL}12` }}>
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
                           color:"rgba(21,21,26,0.45)", lineHeight:1.65 }}>
              Paid-off townhome sitting at 3x its original purchase price,
              six minutes from The Battery Atlanta. Owner is not selling
              and not refinancing through a traditional bank. Looking for
              a verified capital partner to unlock the equity, rental
              income or a structured note, while keeping long-term
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
              { k:"Rent estimate", v:"$1,850 / month" },
              { k:"Location edge", v:"6 min · Truist Park" },
            ].map(s => (
              <div key={s.k} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.46rem",
                               color:"rgba(21,21,26,0.25)",
                               textTransform:"uppercase",
                               letterSpacing:"0.1em", marginBottom:2 }}>{s.k}</div>
                <div style={{ fontFamily:M, fontSize:"0.66rem",
                               fontWeight:700, color:TEAL }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ padding:"0.625rem 0.875rem", background:"var(--surface-raised)",
                         display:"flex", gap:"0.5rem", alignItems:"center",
                         flexWrap:"wrap", justifyContent:"space-between" }}>
            <div style={{ fontFamily:S, fontSize:"0.58rem",
                           color:"rgba(21,21,26,0.3)", lineHeight:1.5,
                           maxWidth:160 }}>
              No bank route. Verified capital only. Long-term hold.
            </div>
            <Button onClick={() => onInvest("aas-4")} color={TEAL} size="sm">
              INVEST →
            </Button>
          </div>
        </div>

        {/* AAS-5 Naj Tulum, unit at a condo-hotel in Aldea Zama, Tulum, Mexico */}
        <div style={{ borderRadius:8, overflow:"hidden",
                       border:"1px solid #F59E0B55",
                       background:"#1c1206" }}>
          <div style={{ padding:"0.875rem 1rem 0" }}>
            <AssetGallery images={NAJ_TULUM_IMAGES} fallbackLabel="Naj Tulum" color={A} />
          </div>

          <div style={{ padding:"0.875rem 1rem",
                         borderBottom:"1px solid #F59E0B20",
                         background:"rgba(245,158,11,0.12)" }}>
            <div style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                           color:A, marginBottom:"0.375rem" }}>
              Real Estate · Tulum, Mexico · International Asset
            </div>
            <div style={{ fontFamily:"Georgia,serif",
                           fontSize:"clamp(1rem,2.5vw,1.25rem)",
                           fontWeight:700, color:W, marginBottom:"0.375rem" }}>
              Naj Tulum
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(21,21,26,0.45)", lineHeight:1.65 }}>
              A unit at Naj Tulum, a boutique condo-hotel in Aldea Zama,
              purchased in 2023 and owned outright. Foreign ownership of
              coastal Mexican real estate like this is held through a
              fideicomiso, a bank trust structure, which Abraxas verifies
              as part of confirming clear title.
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                         gap:"1px", background:BDR }}>
            {[
              { k:"Location",       v:"Aldea Zama, Tulum, MX" },
              { k:"Purchased",      v:"2023" },
              { k:"Ownership",      v:"Owned outright" },
              { k:"Title structure", v:"Fideicomiso (bank trust)" },
              { k:"Monthly income", v:"$1,500 / month" },
              { k:"Lien status",    v:"Clear · No debt" },
            ].map(s => (
              <div key={s.k} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.46rem",
                               color:"rgba(21,21,26,0.25)",
                               textTransform:"uppercase",
                               letterSpacing:"0.1em", marginBottom:2 }}>{s.k}</div>
                <div style={{ fontFamily:M, fontSize:"0.66rem",
                               fontWeight:700, color:A }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ padding:"0.625rem 0.875rem", background:"var(--surface-raised)",
                         display:"flex", alignItems:"center",
                         gap:"0.4rem" }}>
            <span style={{ color:A, fontSize:"0.7rem" }}>✓</span>
            <span style={{ fontFamily:S, fontSize:"0.66rem", fontWeight:600,
                            color:A }}>
              Owned outright, not open to outside investors
            </span>
          </div>
        </div>
        </>)}

      </div>
      </ScrollFade>
    </div>
  );
}
