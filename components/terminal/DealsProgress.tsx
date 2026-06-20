"use client";
// FILE: components/terminal/DealsProgress.tsx
// Honest progress tracker for active land, mineral, and oil deal pipeline.
// Investor-facing fields added: minimum participation, structure, use of
// proceeds, and an inline express-interest form per deal.

import { useState } from "react";
import { M, S, G, A, B, W, BDR, CARD, TEAL } from "./tokens";
import { Button } from "./ui";
import { ContactForm } from "@/components/ContactForm";

// Fill in once you create a Calendly link. Until then, the button is
// honestly hidden rather than linking to nothing.
const CALENDLY_URL: string | null = null;

interface Deal {
  id: string;
  name: string;
  type: string;
  color: string;
  stages: string[];
  current: number;
  note: string;
  minInvestment: string;
  structure: string;
  useOfProceeds: string;
  closedDate?: string; // set this when express interest closes for a deal
}

const DEALS: Deal[] = [
  {
    id: "tribal-mineral",
    name: "Tribal Mineral Rights",
    type: "MINERAL RIGHTS · SOVEREIGN LAND",
    color: A,
    stages: ["Introduced","Due Diligence","LOI Signed","Structured","On-Chain","Active"],
    current: 3,
    note: "Deal terms structured. Operator agreement finalized.",
    minInvestment: "$25,000",
    structure: "Reg D 506(c) · Royalty token",
    useOfProceeds: "Operator LOI execution, lease structuring, legal",
    closedDate: "2026-06-19",
  },
  {
    id: "oil-gas",
    name: "Oil & Gas Program",
    type: "OIL & GAS · WORKING INTEREST",
    color: "#F97316",
    stages: ["Introduced","Investor Ready","Deal Structured","Funded","Producing","On-Chain"],
    current: 3,
    note: "Fully funded. Moving toward production phase.",
    minInvestment: "$50,000",
    structure: "Reg D 506(c) · Working interest",
    useOfProceeds: "Drilling participation, completion costs",
    closedDate: "2026-06-19",
  },
  {
    id: "entertainment-ip",
    name: "Entertainment IP Acquisition",
    type: "INTELLECTUAL PROPERTY · LIVE SHOWS",
    color: B,
    stages: ["Introduced","Term Sheet","Negotiation","Acquired","Tokenized","Active"],
    current: 2,
    note: "In active negotiation. Specific rights and terms confidential until signed, details will be shared once the deal closes.",
    minInvestment: "$15,000",
    structure: "Rights acquisition · Royalty share",
    useOfProceeds: "Rights acquisition, production budget",
  },
  {
    id: "world-studios",
    name: "World Studios Kansas City",
    type: "CREATIVE HUB · LIVE PRODUCTION",
    color: TEAL,
    stages: ["Concept","Site Identified","LOI","Under Contract","Acquired","Open"],
    current: 1,
    note: "$20K+ in live performance equipment already deployed and operational. Co-founded with a creative partner who graduated from the University of Kansas theatre program and has toured nonstop with a prominent live play company across the US and internationally since graduating, real production experience behind the project, not just capital. Active discussions with production companies that are winding down or retiring to acquire their rights catalog under World Studios. Site identification in Kansas City underway. LOI discussions next.",
    minInvestment: "$25,000",
    structure: "Reg D 506(c) · Fractional equity",
    useOfProceeds: "Site acquisition, buildout, equipment expansion, rights catalog acquisition",
    closedDate: "2026-06-20",
  },
];

function ProgressBar({ stages, current, color }: {
  stages: string[];
  current: number;
  color: string;
}) {
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:0,
                     marginBottom:"0.375rem" }}>
        {stages.map((stage, i) => (
          <div key={stage} style={{ display:"flex", alignItems:"center",
                                     flex: i < stages.length - 1 ? 1 : 0 }}>
            <div style={{ display:"flex", flexDirection:"column",
                           alignItems:"center", gap:"0.2rem", flexShrink:0 }}>
              <div style={{ width:12, height:12, borderRadius:"50%",
                             background: i < current
                               ? color
                               : i === current
                                 ? `${color}40`
                                 : "rgba(255,255,255,0.08)",
                             border: `1.5px solid ${i <= current ? color : "rgba(255,255,255,0.12)"}`,
                             boxShadow: i === current ? `0 0 0 3px ${color}25` : "none",
                             transition:"all 0.3s" }} />
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex:1, height:1, margin:"0 2px",
                             background: i < current
                               ? `${color}60`
                               : "rgba(255,255,255,0.06)",
                             marginBottom:"0.8rem" }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        {stages.map((stage, i) => (
          <div key={stage} style={{ fontFamily:M, fontSize:"0.42rem",
                                     color: i === current ? color
                                       : i < current ? `${color}60`
                                       : "rgba(255,255,255,0.2)",
                                     textAlign:"center",
                                     maxWidth:60, lineHeight:1.2,
                                     fontWeight: i === current ? 700 : 400 }}>
            {stage}
          </div>
        ))}
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const [expanded, setExpanded] = useState(false);
  const [email,    setEmail]    = useState("");
  const [sent,     setSent]     = useState(false);
  const [sending,  setSending]  = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySent,  setNotifySent]  = useState(false);

  async function expressInterest() {
    if (!email) return;
    setSending(true);
    try {
      await fetch("/api/invest/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: deal.id,
          asset_name: deal.name,
          investment_option: "Deal Pipeline Interest",
          email,
          amount_interest: null,
        }),
      });
    } catch { /* fail open */ }
    setSent(true);
    setSending(false);
  }

  async function notifyNextDeal() {
    if (!notifyEmail) return;
    try {
      await fetch("/api/invest/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: deal.id,
          asset_name: `${deal.name} (next opportunity)`,
          investment_option: "Notify on next deal",
          email: notifyEmail,
          amount_interest: null,
        }),
      });
    } catch { /* fail open */ }
    setNotifySent(true);
  }

  const isClosed = !!deal.closedDate;

  return (
    <div style={{ background:CARD,
                   border: isClosed ? `1px solid ${BDR}` : `1px solid ${deal.color}35`,
                   borderLeft:`3px solid ${deal.color}`,
                   borderRadius:7, padding:"1rem 1.125rem",
                   opacity: isClosed ? 0.85 : 1 }}>
      <div style={{ display:"flex", justifyContent:"space-between",
                     alignItems:"flex-start", marginBottom:"0.75rem",
                     flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <div style={{ fontFamily:S, fontSize:"clamp(0.85rem,1.8vw,1rem)",
                         fontWeight:700, color:W, marginBottom:2 }}>
            {deal.name}
          </div>
          <div style={{ fontFamily:M, fontSize:"0.5rem",
                         color:"rgba(255,255,255,0.3)",
                         letterSpacing:"0.1em",
                         textTransform:"uppercase" }}>
            {deal.type}
          </div>
        </div>
        <div style={{ padding:"0.2rem 0.5rem", borderRadius:3,
                       background:`${deal.color}12`,
                       border:`1px solid ${deal.color}30`,
                       fontFamily:M, fontSize:"0.48rem", fontWeight:700,
                       color:deal.color, letterSpacing:"0.06em",
                       textTransform:"uppercase", whiteSpace:"nowrap" }}>
          {deal.stages[deal.current]}
        </div>
      </div>

      <ProgressBar stages={deal.stages} current={deal.current} color={deal.color} />

      {/* Details now always visible, no hidden toggle to miss */}
      <div style={{ marginTop:"0.75rem" }}>
        <div style={{ fontFamily:S, fontSize:"0.68rem",
                       color:"rgba(255,255,255,0.4)",
                       marginBottom:"0.75rem", lineHeight:1.5 }}>
          {deal.note}
        </div>

        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
                       gap:"1px", background:BDR, borderRadius:5,
                       overflow:"hidden", marginBottom:"0.75rem" }}>
          {(isClosed
            ? [
                { label:"Status",    val: deal.stages[deal.current] },
                { label:"Structure", val: deal.structure },
                { label:"Next Step", val: deal.stages[Math.min(deal.current + 1, deal.stages.length - 1)] },
              ]
            : [
                { label:"Minimum",      val:deal.minInvestment },
                { label:"Structure",    val:deal.structure },
                { label:"Use of Funds", val:deal.useOfProceeds },
              ]
          ).map(f => (
            <div key={f.label} style={{ background:"#08090F", padding:"0.5rem 0.625rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.44rem",
                             color:"rgba(255,255,255,0.25)",
                             textTransform:"uppercase", letterSpacing:"0.08em",
                             marginBottom:2 }}>{f.label}</div>
              <div style={{ fontFamily:S, fontSize:"0.62rem",
                             color:"rgba(255,255,255,0.55)", lineHeight:1.3 }}>{f.val}</div>
            </div>
          ))}
        </div>
      </div>

      {isClosed ? (
        notifySent ? (
          <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:600, color:deal.color,
                         padding:"0.6rem 0", textAlign:"center" }}>
            You're on the list. We'll reach out when the next one opens.
          </div>
        ) : (
          <div style={{ padding:"0.75rem", borderRadius:8,
                         background:`${deal.color}0D`,
                         border:`1px solid ${deal.color}30` }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.4rem",
                           marginBottom:"0.5rem" }}>
              <span style={{ color:deal.color, fontSize:"0.75rem" }}>✓</span>
              <span style={{ fontFamily:S, fontSize:"0.74rem", fontWeight:700,
                              color:deal.color }}>
                Closed to new investors, {new Date(deal.closedDate!).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
              </span>
            </div>
            <div style={{ fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.5)", lineHeight:1.5,
                           marginBottom:"0.625rem" }}>
              This window passed. Investors who acted early are already in.
              Get notified the moment a similar opportunity opens, or check
              what's active right now below.
            </div>
            <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
              <input
                value={notifyEmail}
                onChange={e => setNotifyEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
                style={{ flex:1, minWidth:160, padding:"0.5rem 0.625rem",
                          borderRadius:5, border:`1px solid ${BDR}`,
                          background:"rgba(255,255,255,0.03)",
                          color:W, fontFamily:S, fontSize:"16px" }}
              />
              <Button onClick={notifyNextDeal} color={deal.color} size="sm">
                NOTIFY ME →
              </Button>
            </div>
          </div>
        )
      ) : sent ? (
        <div style={{ fontFamily:M, fontSize:"0.62rem", color:deal.color,
                       padding:"0.5rem 0", textAlign:"center" }}>
          Interest received. Our team will follow up by email.
        </div>
      ) : expanded ? (
        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            type="email"
            style={{ flex:1, minWidth:160, padding:"0.5rem 0.625rem",
                      borderRadius:5, border:`1px solid ${BDR}`,
                      background:"rgba(255,255,255,0.03)",
                      color:W, fontFamily:S, fontSize:"16px" }}
          />
          <Button onClick={expressInterest} color={deal.color} size="sm">
            {sending ? "..." : "SEND →"}
          </Button>
        </div>
      ) : (
        <Button onClick={() => setExpanded(true)} color={deal.color} size="sm">
          EXPRESS INTEREST →
        </Button>
      )}
    </div>
  );
}

export function DealsProgress() {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                     marginBottom:"0.875rem" }}>
        <div style={{ width:3, height:18, background:A, borderRadius:2,
                       boxShadow:`0 0 6px ${A}60` }} />
        <span style={{ fontFamily:M, fontSize:"clamp(0.78rem,1.8vw,0.92rem)",
                        fontWeight:800, color:A, letterSpacing:"0.16em",
                        textTransform:"uppercase" }}>
          ACTIVE DEAL PIPELINE
        </span>
        <span style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                        color:A, background:`${A}15`, border:`1px solid ${A}30`,
                        borderRadius:3, padding:"1px 7px",
                        letterSpacing:"0.08em", textTransform:"uppercase" }}>
          {DEALS.length} DEALS TRACKED
        </span>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
        {DEALS.map(deal => <DealCard key={deal.id} deal={deal} />)}
      </div>

      <div style={{ marginTop:"0.75rem", padding:"0.625rem 0.875rem",
                     borderRadius:5, background:"rgba(255,255,255,0.02)",
                     border:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontFamily:S, fontSize:"0.68rem",
                       color:"rgba(255,255,255,0.3)", lineHeight:1.6 }}>
          Deal pipeline reflects active development. Stages advance as milestones
          are verified and documented on Abraxas Protocol.
        </div>
      </div>

      <InvestorInquiry />
    </div>
  );
}

function InvestorInquiry() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div style={{ marginTop:"1rem", padding:"1rem 1.125rem",
                   borderRadius:8, background:CARD,
                   border:`1px solid ${BDR}` }}>
      <div style={{ display:"flex", alignItems:"flex-start",
                     justifyContent:"space-between", flexWrap:"wrap",
                     gap:"0.75rem", marginBottom: showForm ? "1.25rem" : 0 }}>
        <div>
          <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                         color:W, marginBottom:"0.375rem" }}>
            Interested in one of these deals?
          </div>
          <p style={{ fontFamily:S, fontSize:"0.76rem",
                       color:"rgba(255,255,255,0.45)", lineHeight:1.6,
                       maxWidth:480, margin:0 }}>
            Reach out directly, no need to wait for an asset to open
            formally. Tell us which deal interests you.
          </p>
        </div>
        <Button onClick={() => setShowForm(s => !s)} color={G} size="sm">
          {showForm ? "CLOSE" : "CONTACT US"}
        </Button>
      </div>
      {showForm && (
        <ContactForm
          category="investor-inquiry"
          color={G}
          organizationLabel="Fund or company (optional)"
          placeholder="Which deal interests you, and what would you like to know?"
        />
      )}

      {/* Live support, book time directly with the founder */}
      <div style={{ marginTop:"1rem", paddingTop:"1rem",
                     borderTop:`1px solid ${BDR}`,
                     display:"flex", alignItems:"center", justifyContent:"space-between",
                     flexWrap:"wrap", gap:"0.625rem" }}>
        <div style={{ fontFamily:S, fontSize:"0.76rem",
                       color:"rgba(255,255,255,0.4)" }}>
          Prefer to talk it through? Book a call directly.
        </div>
        {CALENDLY_URL ? (
          <Button href={CALENDLY_URL} color={B} size="sm">
            BOOK A CALL
          </Button>
        ) : (
          <span style={{ fontFamily:S, fontSize:"0.68rem",
                          color:"rgba(255,255,255,0.25)" }}>
            Calendly link coming soon
          </span>
        )}
      </div>
    </div>
  );
}
