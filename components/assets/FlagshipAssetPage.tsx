// FILE: components/assets/FlagshipAssetPage.tsx
// Cielo Sunrise, Genesis Asset, Billboard institutional showcase
"use client";

import { useState }             from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FLAGSHIP_PROPERTY }    from "@/lib/data/flagshipProperty";

const M      = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
// Dark premium restyle (redesign). Data/content unchanged.
const BG     = "#06090B";
const CARD   = "#121A16";
const BORDER = "rgba(255,255,255,0.09)";
const GREEN  = "#10B981";
const AMBER  = "#F59E0B";
const BLUE   = "#3B82F6";

const D = FLAGSHIP_PROPERTY;
const F = D.financials;
const V = D.verification;
const C = D.collateral;

type Tab = "overview" | "financials" | "verification" | "collateral";

// ── Primitives ────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title:string; icon:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:"2rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                     marginBottom:"1rem", paddingBottom:"0.625rem",
                     borderBottom:"1px solid " + BORDER }}>
        <span style={{ color:GREEN, fontSize:"0.7rem" }}>{icon}</span>
        <span style={{ fontFamily:M, fontSize:"0.36rem", fontWeight:700,
                        color:"rgba(242,246,243,0.3)", textTransform:"uppercase",
                        letterSpacing:"0.2em" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, sub, color = "#F2F6F3" }: { label:string; value:string; sub?:string; color?:string }) {
  return (
    <div style={{ padding:"1rem", background:CARD, border:"1px solid " + BORDER, borderRadius:"6px" }}>
      <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(242,246,243,0.2)",
                     textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.35rem" }}>
        {label}
      </div>
      <div style={{ fontFamily:M, fontSize:"clamp(0.9rem,2.5vw,1.3rem)", fontWeight:900, color, lineHeight:1 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(242,246,243,0.2)", marginTop:"0.25rem" }}>{sub}</div>}
    </div>
  );
}

function HashRow({ label, value, link }: { label:string; value:string; link?:string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ padding:"0.625rem 0", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(242,246,243,0.2)",
                     textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.2rem" }}>{label}</div>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <code style={{ fontFamily:M, fontSize:"0.4rem", color:GREEN, wordBreak:"break-all", flex:1, lineHeight:1.5 }}>{value}</code>
        <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{ padding:"2px 6px", borderRadius:"3px", border:"1px solid " + BORDER,
                    background:"rgba(16,185,129,0.08)", color:GREEN, fontSize:"0.28rem",
                    cursor:"pointer", fontFamily:M, flexShrink:0 }}>
          {copied ? "✓" : "COPY"}
        </button>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            style={{ padding:"2px 6px", borderRadius:"3px", border:"1px solid " + BORDER,
                      background:"rgba(49,130,206,0.08)", color:BLUE, fontSize:"0.28rem",
                      textDecoration:"none", fontFamily:M, flexShrink:0 }}>
            EXPLORER →
          </a>
        )}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────

export function FlagshipAssetPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const reduce = useReducedMotion();

  const tabs: { id: Tab; label: string }[] = [
    { id:"overview",     label:"OVERVIEW"      },
    { id:"financials",   label:"FINANCIALS"    },
    { id:"verification", label:"VERIFICATION"  },
    { id:"collateral",   label:"COLLATERAL"    },
  ];

  const maxRev = Math.max(...F.monthlyRevenue.map(m => m.rev));

  return (
    <div style={{ background:BG, minHeight:"100vh", color:"#F2F6F3" }}>

      {/* ── BILLBOARD HERO ────────────────────────────────────────────── */}
      <div style={{ background: BG,
                     padding:"clamp(2.5rem,6vw,5rem) clamp(1rem,4vw,2.5rem) 2.5rem",
                     borderBottom:"1px solid " + BORDER }}>

        {/* Badges */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                       marginBottom:"1.5rem", flexWrap:"wrap" }}>
          {[
            { label:"◈ GENESIS ASSET · SERIES A", color:GREEN },
            { label:"AAS-1 VERIFIED",             color:BLUE },
            { label:"COLLATERAL ELIGIBLE",         color:AMBER },
            { label:"⬡ ACTIVE NOW",               color:GREEN },
            { label:"● LIVE ON AIRBNB",            color:GREEN },
          ].map(b => (
            <span key={b.label} style={{
              padding:"3px 10px", borderRadius:"3px",
              background: b.color + "15", border:"1px solid " + b.color + "35",
              fontFamily:M, fontSize:"0.3rem", fontWeight:900,
              color:b.color, textTransform:"uppercase", letterSpacing:"0.12em",
            }}>{b.label}</span>
          ))}
          {/* USDC Coming Soon */}
          <span style={{
            padding:"3px 10px", borderRadius:"3px",
            background:"rgba(37,99,235,0.12)", border:"1px solid rgba(37,99,235,0.3)",
            fontFamily:M, fontSize:"0.3rem", fontWeight:900,
            color:BLUE, textTransform:"uppercase", letterSpacing:"0.12em",
          }}>
            USDC BOOKING, COMING SOON
          </span>
        </div>

        {/* Billboard headline */}
        <h1 style={{ fontFamily:M, fontSize:"clamp(2rem,6vw,4.5rem)", fontWeight:900,
                      color:"#F2F6F3", margin:"0 0 0.5rem",
                      letterSpacing:"-0.04em", lineHeight:1 }}>
          CIELO SUNRISE
        </h1>
        <div style={{ fontFamily:M, fontSize:"clamp(0.52rem,1.6vw,0.76rem)",
                       color:"rgba(242,246,243,0.35)", marginBottom:"0.5rem" }}>
          Private Mountain Wellness Retreat · Mineral Bluff, Georgia
        </div>
        <div style={{ fontFamily:M, fontSize:"clamp(0.4rem,1.2vw,0.52rem)",
                       color:"rgba(242,246,243,0.2)", marginBottom:"2.5rem" }}>
          12 guests · 4 bedrooms · 5 beds · 3.5 baths · 2,800-ft ridgeline · Tri-state views
        </div>

        {/* Hero metrics */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"0.625rem", marginBottom:"2rem" }}>
          <Metric label="Appraised Value"      value="$1,100,000"        sub="May 2025"          color="#F2F6F3" />
          <Metric label="Annual NOI"           value="$109,500"          sub="Owner-managed"     color={GREEN}  />
          <Metric label="Cash Yield"           value="14.6%"             sub="On purchase price" color={GREEN}  />
          <Metric label="Avg Occupancy"        value="75%"               sub="Annual average"    color={BLUE}   />
          <Metric label="Max Borrow Capacity"  value="$660,000 USDC"     sub="60% LTV"           color={BLUE}   />
          <Metric label="Collateral Score"     value={`${C.collateralScore} / 100`} sub="AAA Institutional" color={AMBER}  />
        </div>

        {/* CTAs */}
        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", alignItems:"center" }}>
          <a href={D.airbnbUrl} target="_blank" rel="noopener noreferrer"
            style={{ padding:"0.75rem 1.75rem", borderRadius:"5px",
                      border:"1px solid " + GREEN + "50", background:GREEN + "18",
                      fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                      color:GREEN, textDecoration:"none",
                      letterSpacing:"0.06em", boxShadow:"0 0 20px " + GREEN + "25" }}>
            VIEW LIVE AIRBNB LISTING →
          </a>
          <span style={{ fontFamily:M, fontSize:"0.38rem", color:"rgba(242,246,243,0.35)",
                         letterSpacing:"0.06em", maxWidth:280, lineHeight:1.5 }}>
            Real Superhost property in Mineral Bluff, GA — bookable today. Not a mock asset.
          </span>
          <a href={D.instagramUrl} target="_blank" rel="noopener noreferrer"
            style={{ padding:"0.75rem 1.75rem", borderRadius:"5px",
                      border:"1px solid rgba(168,85,247,0.3)",
                      background:"rgba(168,85,247,0.06)",
                      fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                      color:"rgba(168,85,247,0.7)", textDecoration:"none",
                      letterSpacing:"0.06em" }}>
            @CIELOSUNRISE ↗
          </a>
          <div style={{ padding:"0.75rem 1.75rem", borderRadius:"5px",
                         border:"1px solid rgba(37,99,235,0.3)",
                         background:"rgba(37,99,235,0.06)",
                         fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                         color:"rgba(96,165,250,0.7)", letterSpacing:"0.06em",
                         cursor:"not-allowed", opacity:0.8 }}>
            BOOK WITH USDC, COMING SOON
          </div>
        </div>
      </div>

      {/* ── TAB NAV ───────────────────────────────────────────────────── */}
      <div style={{ display:"flex", borderBottom:"1px solid " + BORDER,
                     background:CARD, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"0.875rem clamp(0.75rem,2vw,1.25rem)",
            background: tab === t.id ? BLUE + "12" : "transparent",
            border:"none",
            borderBottom: tab === t.id ? "2px solid " + BLUE : "2px solid transparent",
            fontFamily:M, fontSize:"clamp(0.3rem,1vw,0.38rem)", fontWeight:700,
            color: tab === t.id ? BLUE : "rgba(242,246,243,0.3)",
            cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.12em",
            whiteSpace:"nowrap", transition:"all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth:1100, margin:"0 auto",
                     padding:"2rem clamp(1rem,3vw,2rem) 4rem" }}>

        {/* ═══ OVERVIEW ═══════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"1.5rem" }}>

            <Section title="Property Overview" icon="⬛">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                {[
                  ["Type",           "Entire cabin, private"],
                  ["Location",       "Mineral Bluff, GA"],
                  ["Bedrooms",       "4"],
                  ["Beds",           "5"],
                  ["Bathrooms",      "3.5"],
                  ["Max Guests",     "12 (17 total capacity)"],
                  ["Check-In",       "Keypad self check-in"],
                  ["EV Charging",    "Level 2, 220V"],
                  ["WiFi",           "1 Gig fiber"],
                  ["Parking",        "6+ vehicles, free"],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding:"0.625rem", background:CARD,
                                          border:"1px solid " + BORDER, borderRadius:"4px" }}>
                    <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(242,246,243,0.2)",
                                   textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{k}</div>
                    <div style={{ fontFamily:M, fontSize:"0.48rem", fontWeight:700, color:"#F2F6F3" }}>{v}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Signature Experience" icon="◈">
              <div style={{ padding:"1rem", background:"rgba(16,185,129,0.05)",
                             border:"1px solid rgba(16,185,129,0.15)", borderRadius:"6px",
                             marginBottom:"0.875rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.44rem", fontWeight:800,
                               color:GREEN, marginBottom:"0.4rem" }}>
                  ✨ Mirrored Geodesic Wellness Dome
                </div>
                <div style={{ fontFamily:M, fontSize:"0.44rem", color:"rgba(242,246,243,0.4)", lineHeight:1.7 }}>
                  The dome is the signature experience. Set on its own elevated deck overlooking the mountains.
                  Lay-down infrared sauna · Red light therapy · Climate control · Queen sleeper sofa.
                  By day, the reflective exterior mirrors the ridgeline.
                </div>
              </div>
              <div style={{ fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                             color:"rgba(242,246,243,0.3)", marginBottom:"0.5rem",
                             textTransform:"uppercase", letterSpacing:"0.1em" }}>
                Wellness Circuit
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.375rem" }}>
                {D.property.amenities.wellness.map(a => (
                  <span key={a} style={{ padding:"3px 8px", borderRadius:"3px",
                                          background:GREEN + "08", border:"1px solid " + GREEN + "20",
                                          fontFamily:M, fontSize:"0.38rem",
                                          color:"rgba(242,246,243,0.45)" }}>{a}</span>
                ))}
              </div>
            </Section>

            <Section title="Sleeping Arrangements" icon="◉">
              {D.property.rooms.map(r => (
                <div key={r.name} style={{ marginBottom:"0.75rem", padding:"0.75rem",
                                             background:CARD, border:"1px solid " + BORDER,
                                             borderRadius:"5px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                                 alignItems:"baseline", marginBottom:"0.25rem" }}>
                    <span style={{ fontFamily:M, fontSize:"0.48rem", fontWeight:700, color:"#F2F6F3" }}>
                      {r.name}
                    </span>
                    <span style={{ fontFamily:M, fontSize:"0.32rem",
                                    color:"rgba(242,246,243,0.25)" }}>
                      {r.guests} guests · {r.beds}
                    </span>
                  </div>
                  <div style={{ fontFamily:M, fontSize:"0.38rem",
                                 color:"rgba(242,246,243,0.35)", lineHeight:1.6 }}>
                    {r.desc}
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Guest Intelligence" icon="◆">
              <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1rem" }}>
                <div style={{ fontFamily:M, fontSize:"2.8rem", fontWeight:900, color:GREEN }}>5.0</div>
                <div>
                  <div style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:700, color:"#F2F6F3" }}>
                    {D.guestProfile.totalReviews} Reviews
                  </div>
                  <div style={{ fontFamily:M, fontSize:"0.38rem", color:AMBER, fontWeight:700 }}>
                    ★ SUPERHOST · Response: {D.guestProfile.responseTime}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                {D.guestProfile.reviews.map((r, i) => (
                  <div key={i} style={{ padding:"0.75rem", background:CARD,
                                          border:"1px solid " + BORDER, borderRadius:"5px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                                   marginBottom:"0.35rem" }}>
                      <span style={{ fontFamily:M, fontSize:"0.44rem", fontWeight:700, color:"#F2F6F3" }}>
                        {r.name}
                      </span>
                      <span style={{ fontFamily:M, fontSize:"0.32rem", color:"rgba(242,246,243,0.2)" }}>
                        {r.when} · ★★★★★
                      </span>
                    </div>
                    <div style={{ fontFamily:M, fontSize:"0.4rem",
                                   color:"rgba(242,246,243,0.35)", lineHeight:1.65,
                                   fontStyle:"italic" }}>
                      "{r.highlight}"
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Full Amenities, 64 Offerings" icon="◈">
              {Object.entries(D.property.amenities).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom:"0.875rem" }}>
                  <div style={{ fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                                 color:"rgba(242,246,243,0.2)", textTransform:"uppercase",
                                 letterSpacing:"0.1em", marginBottom:"0.35rem" }}>
                    {cat.replace(/([A-Z])/g, " $1").toUpperCase()}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem" }}>
                    {(items as string[]).map(a => (
                      <span key={a} style={{ padding:"2px 7px", borderRadius:"3px",
                                              background:"rgba(242,246,243,0.03)",
                                              border:"1px solid " + BORDER,
                                              fontFamily:M, fontSize:"0.36rem",
                                              color:"rgba(242,246,243,0.4)" }}>{a}</span>
                    ))}
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Ownership Structure" icon="◉">
              {[
                ["Entity",         D.ownership.entityName],
                ["Type",           D.ownership.entityType],
                ["State",          D.ownership.state],
                ["Host",           D.ownership.host + " + " + D.ownership.coHost],
                ["Title Status",   D.ownership.titleStatus],
                ["Insurance",      D.ownership.insurance],
                ["Management",     D.ownership.propertyMgmt],
              ].map(([k, v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                       padding:"0.5rem 0",
                                       borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontFamily:M, fontSize:"0.38rem", color:"rgba(242,246,243,0.3)" }}>{k}</span>
                  <span style={{ fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                                  color: v.includes("CLEAR") ? GREEN : "#F2F6F3",
                                  textAlign:"right", maxWidth:"55%" }}>{v}</span>
                </div>
              ))}
            </Section>

          </div>
        )}

        {/* ═══ FINANCIALS ═════════════════════════════════════════════ */}
        {tab === "financials" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
                           gap:"0.625rem", marginBottom:"2rem" }}>
              {[
                { label:"Gross Revenue (TTM)",    value:"$138,000",  color:GREEN  },
                { label:"Net Operating Income",   value:"$109,500",  color:GREEN  },
                { label:"Cap Rate",               value:"9.95%",     color:GREEN  },
                { label:"Cash-on-Cash Yield",     value:"14.6%",     color:GREEN  },
                { label:"Avg Nightly Rate",       value:"$595",      color:"#F2F6F3" },
                { label:"Peak Season Rate",       value:"$895",      color:"#F2F6F3" },
                { label:"Annual Occupancy",       value:"75%",       color:BLUE   },
                { label:"Debt Service Coverage",  value:"2.4x",      color:AMBER  },
              ].map(m => <Metric key={m.label} {...m} />)}
            </div>

            <Section title="Monthly Revenue, Trailing 12 Months" icon="◈">
              <div style={{ display:"flex", alignItems:"flex-end", gap:"0.375rem", height:120, padding:"0.5rem 0" }}>
                {F.monthlyRevenue.map((m, i) => {
                  const h = Math.round((m.rev / maxRev) * 100);
                  return (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column",
                                           alignItems:"center", gap:"0.25rem" }}>
                      <div style={{ fontFamily:M, fontSize:"0.28rem", color:GREEN }}>
                        ${(m.rev / 1000).toFixed(0)}k
                      </div>
                      <motion.div
                        initial={reduce ? false : { height: "0%" }}
                        animate={{ height: h + "%" }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                        style={{ width:"100%", minHeight:4,
                                 background: GREEN,
                                 borderRadius:"2px 2px 0 0" }}/>
                      <div style={{ fontFamily:M, fontSize:"0.24rem",
                                     color:"rgba(242,246,243,0.2)",
                                     transform:"rotate(-45deg)", whiteSpace:"nowrap" }}>
                        {m.month.slice(0, 3)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Income & Expense Summary" icon="◆">
              {[
                { label:"Gross Booking Revenue",      value:"$138,000",  positive:true,  bold:false },
                { label:"Platform Fees (0%, Owner Managed)", value:"$0",positive:true,  bold:false },
                { label:"Operating Expenses",         value:"-$28,500",  positive:false, bold:false },
                { label:"Net Operating Income",       value:"$109,500",  positive:true,  bold:true  },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", justifyContent:"space-between",
                                               padding:"0.625rem 0",
                                               borderBottom:"1px solid rgba(255,255,255,0.07)",
                                               borderTop: row.bold ? "1px solid " + BORDER : "none" }}>
                  <span style={{ fontFamily:M, fontSize:"0.44rem",
                                  color: row.bold ? "#F2F6F3" : "rgba(242,246,243,0.4)",
                                  fontWeight: row.bold ? 800 : 400 }}>
                    {row.label}
                  </span>
                  <span style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:800,
                                  color: row.positive ? GREEN : "#EF4444" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </Section>
          </div>
        )}

        {/* ═══ VERIFICATION ═══════════════════════════════════════════ */}
        {tab === "verification" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>

            <Section title="AAS-1 Verification Certificate" icon="◉">
              <div style={{ padding:"1rem", background:"rgba(16,185,129,0.06)",
                             border:"1px solid rgba(16,185,129,0.25)", borderRadius:"6px",
                             marginBottom:"0.875rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.5rem" }}>
                  <span style={{ color:GREEN, fontSize:"0.9rem" }}>✓</span>
                  <span style={{ fontFamily:M, fontSize:"0.44rem", fontWeight:900, color:GREEN }}>
                    VERIFIED, AAS-1 STANDARD
                  </span>
                </div>
                <div style={{ fontFamily:M, fontSize:"0.36rem", color:"rgba(242,246,243,0.3)", lineHeight:1.7 }}>
                  Certificate: {V.certificateId}<br />
                  Issued: {new Date(V.issuedAt).toLocaleDateString()}<br />
                  Valid Until: {new Date(V.validUntil).toLocaleDateString()}<br />
                  Issuer: {V.verifier}
                </div>
              </div>
              <HashRow label="Document SHA-256 Hash"  value={V.documentHash} />
              <HashRow label="Metadata Hash"           value={V.metaHash} />
              <HashRow label="Anchored Transaction"    value={V.anchoredTx}
                link={"https://explorer.solana.com/tx/" + V.anchoredTx} />
            </Section>

            <Section title="Provenance Timeline" icon="◈">
              <div style={{ position:"relative", paddingLeft:"1.25rem" }}>
                <div style={{ position:"absolute", left:"0.25rem", top:0, bottom:0,
                               width:1, background:"rgba(16,185,129,0.2)" }} />
                {V.provenanceTimeline.map((ev, i) => (
                  <div key={i} style={{ position:"relative", marginBottom:"0.875rem" }}>
                    <div style={{ position:"absolute", left:"-1.15rem", top:3,
                                   width:8, height:8, borderRadius:"50%",
                                   background: ev.status === "COMPLETE" ? GREEN : AMBER,
                                   border:"2px solid " + BG }} />
                    <div style={{ fontFamily:M, fontSize:"0.28rem",
                                   color:"rgba(242,246,243,0.2)", marginBottom:2 }}>{ev.date}</div>
                    <div style={{ fontFamily:M, fontSize:"0.44rem",
                                   fontWeight:700, color:"#F2F6F3", marginBottom:2 }}>{ev.event}</div>
                    <div style={{ fontFamily:M, fontSize:"0.34rem",
                                   color:"rgba(242,246,243,0.3)" }}>{ev.actor}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Custody Ledger, Multi-Signature" icon="◆">
              <div style={{ marginBottom:"0.875rem" }}>
                {[
                  ["Custodian",     V.custodyLedger.custodian],
                  ["Vault Type",    V.custodyLedger.vaultType],
                  ["Jurisdiction",  V.custodyLedger.jurisdiction],
                  ["Audit Cadence", V.custodyLedger.auditCadence],
                ].map(([k, v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                         padding:"0.4rem 0",
                                         borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                    <span style={{ fontFamily:M, fontSize:"0.36rem",
                                    color:"rgba(242,246,243,0.3)" }}>{k}</span>
                    <span style={{ fontFamily:M, fontSize:"0.36rem",
                                    fontWeight:700, color:"#F2F6F3",
                                    textAlign:"right", maxWidth:"55%" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(242,246,243,0.2)",
                             textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.5rem" }}>
                {V.custodyLedger.signatories.length}/{V.custodyLedger.signatories.length} TRUSTEES ATTESTED
              </div>
              {V.custodyLedger.signatories.map(s => (
                <div key={s.id} style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                                          marginBottom:"0.4rem", padding:"0.4rem 0.625rem",
                                          background:CARD, border:"1px solid " + BORDER,
                                          borderRadius:"4px" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                                  background: s.status === "ACTIVE" ? GREEN : AMBER,
                                  boxShadow:"0 0 6px " + (s.status === "ACTIVE" ? GREEN : AMBER) }} />
                  <span style={{ fontFamily:M, fontSize:"0.36rem",
                                  color:"rgba(242,246,243,0.5)", flex:1 }}>{s.role}</span>
                  <code style={{ fontFamily:M, fontSize:"0.32rem", color:GREEN }}>{s.hash}</code>
                </div>
              ))}
            </Section>

          </div>
        )}

        {/* ═══ COLLATERAL ═════════════════════════════════════════════ */}
        {tab === "collateral" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"1.5rem" }}>

            <Section title="Collateral Profile" icon="◆">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                {[
                  { label:"Appraised Value",   value:"$1,100,000", color:"#F2F6F3" },
                  { label:"Max LTV",           value:"60%",         color:GREEN     },
                  { label:"Max Borrow",        value:"$660K USDC",  color:GREEN     },
                  { label:"Collateral Score",  value:`${C.collateralScore} / 100`, color:GREEN },
                  { label:"Liquidity Score",   value:"75 / 100",    color:BLUE      },
                  { label:"Fraud Risk",        value:"2 / 100",     color:GREEN     },
                  { label:"DSCR",              value:"2.4x",        color:GREEN     },
                  { label:"Lender Confidence", value:"HIGH",        color:AMBER     },
                ].map(m => <Metric key={m.label} {...m} />)}
              </div>
            </Section>

            <Section title="Risk Score Breakdown" icon="◉">
              {[
                { label:"Custody, Digital Title Escrow",    pts:15,  ok:true  },
                { label:"Legal, LLC + Clear Title (GA)",    pts:20,  ok:true  },
                { label:"Revenue Telemetry, TTM Verified",  pts:10,  ok:true  },
                { label:"Provenance, Anchored On-Chain",    pts:25,  ok:true  },
                { label:"Appraisal, under 6 months",            pts:10,  ok:true  },
                { label:"Secondary Market Liquidity",        pts:-5,  ok:false },
                { label:"Hospitality Sector Risk",           pts:-8,  ok:false },
              ].map((r, i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr auto 50px",
                                       gap:"0.5rem", alignItems:"center",
                                       padding:"0.5rem 0",
                                       borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontFamily:M, fontSize:"0.38rem",
                                  color:"rgba(242,246,243,0.5)" }}>{r.label}</span>
                  <span style={{ fontFamily:M, fontSize:"0.28rem", fontWeight:700,
                                  color: r.ok ? GREEN : "#EF4444",
                                  textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    {r.ok ? "VERIFIED" : "RISK"}
                  </span>
                  <span style={{ fontFamily:M, fontSize:"0.56rem", fontWeight:900,
                                  color: r.pts > 0 ? GREEN : "#EF4444",
                                  textAlign:"right" }}>
                    {r.pts > 0 ? "+" + r.pts : r.pts}
                  </span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between",
                             padding:"0.625rem 0", borderTop:"1px solid " + BORDER }}>
                <span style={{ fontFamily:M, fontSize:"0.42rem", fontWeight:800,
                                color:"rgba(242,246,243,0.5)", textTransform:"uppercase",
                                letterSpacing:"0.1em" }}>TOTAL COLLATERAL HEALTH</span>
                <span style={{ fontFamily:M, fontSize:"0.9rem", fontWeight:900, color:GREEN }}>
                  {C.collateralScore}/100
                </span>
              </div>
            </Section>

            <Section title="Tokenization" icon="◈">
              {[
                ["Token Standard",   D.tokenization.tokenStandard],
                ["Chain",            D.tokenization.chain],
                ["Mint Cost",        D.tokenization.mintCostAbra + " ABRA"],
                ["Supply",           String(D.tokenization.totalSupply)],
                ["Status",           D.tokenization.status],
                ["Stablecoin",       "USDC, COMING SOON"],
              ].map(([k, v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                       padding:"0.5rem 0",
                                       borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ fontFamily:M, fontSize:"0.38rem",
                                  color:"rgba(242,246,243,0.3)" }}>{k}</span>
                  <span style={{ fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                                  color: v === "COLLATERAL_ELIGIBLE" ? GREEN
                                       : v.includes("COMING SOON") ? BLUE
                                       : "#F2F6F3" }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:"1rem", display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                <a href={D.airbnbUrl} target="_blank" rel="noopener noreferrer"
                  style={{ flex:1, padding:"0.625rem", borderRadius:"5px",
                            border:"1px solid " + BORDER, background:CARD,
                            fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                            color:BLUE, textAlign:"center", textDecoration:"none" }}>
                  AIRBNB LISTING →
                </a>
                <a href={D.instagramUrl} target="_blank" rel="noopener noreferrer"
                  style={{ flex:1, padding:"0.625rem", borderRadius:"5px",
                            border:"1px solid rgba(168,85,247,0.25)",
                            background:"rgba(168,85,247,0.06)",
                            fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                            color:"rgba(168,85,247,0.7)", textAlign:"center",
                            textDecoration:"none" }}>
                  @CIELOSUNRISE →
                </a>
              </div>
            </Section>

          </div>
        )}

      </div>
    </div>
  );
}
