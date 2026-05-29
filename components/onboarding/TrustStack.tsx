// FILE: components/onboarding/TrustStack.tsx
// The trust infrastructure — made explicit and visible.
// "What stands behind the collateral."
"use client";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const GREEN = "#10B981"; const AMBER = "#ED8936"; const BLUE = "#3182CE";
const BORDER = "#1F2937"; const CARD = "#0E1117";

const TRUST_LAYERS = [
  {
    layer: "01",
    title: "Verified Ownership",
    desc:  "Title deed, mineral rights certificate, or legal ownership instrument verified by an approved title company or legal counsel. No unverified claims enter the protocol.",
    status:"REQUIRED", color:GREEN,
    icon: "◉",
    items: ["Title search & insurance", "Deed or conveyance instrument", "Entity ownership verification", "Lien & encumbrance clearance"],
  },
  {
    layer: "02",
    title: "Independent Valuation",
    desc:  "Appraisal, reserve report, or independent valuation by a credentialed appraiser or reservoir engineer. Valuation is the floor of collateral capacity.",
    status:"REQUIRED", color:GREEN,
    icon: "◈",
    items: ["Certified appraiser or reserve engineer", "Methodology disclosure", "Comparable analysis", "Valuation < 12 months"],
  },
  {
    layer: "03",
    title: "Custody Verification",
    desc:  "The physical or legal asset is confirmed to be under a verifiable custody arrangement — vault, legal escrow, or entity-controlled possession.",
    status:"REQUIRED", color:GREEN,
    icon: "◆",
    items: ["Vault receipt or escrow confirmation", "Custodian identity verification", "Jurisdiction compliance", "Audit trail"],
  },
  {
    layer: "04",
    title: "Legal Attestation",
    desc:  "Licensed legal counsel confirms the ownership structure, entity formation, and jurisdictional compliance. No asset proceeds without legal sign-off.",
    status:"REQUIRED", color:GREEN,
    icon: "⬛",
    items: ["Entity formation documents", "Compliance opinion", "Jurisdiction clearance", "Signatory authorization"],
  },
  {
    layer: "05",
    title: "Auditor Review",
    desc:  "An independent auditor reviews the documentation chain for completeness, accuracy, and consistency. The collateral score is derived from audit outcomes.",
    status:"REQUIRED", color:GREEN,
    icon: "◎",
    items: ["Documentation completeness review", "Data cross-verification", "Fraud risk assessment", "Collateral score issuance"],
  },
  {
    layer: "06",
    title: "On-Chain Attestation",
    desc:  "The verified asset record is anchored to Solana via a Token-2022 certificate. Every attestation is a SHA-256 hash committed to a public, permanent ledger.",
    status:"REQUIRED", color:BLUE,
    icon: "◈",
    items: ["SHA-256 document hash", "Solana mainnet anchor", "Tamper-evident provenance", "Public verification"],
  },
  {
    layer: "07",
    title: "Insurance Verification",
    desc:  "Where applicable, insurance coverage is verified and documented. Insured assets receive higher collateral scores and lower liquidation thresholds.",
    status:"WHERE APPLICABLE", color:AMBER,
    icon: "⬡",
    items: ["Coverage certificate", "Named insured confirmation", "Policy in force verification", "Claims history review"],
  },
] as const;

const INTEGRATIONS = [
  { name:"Fireblocks",   desc:"Institutional MPC custody",     status:"PLANNED", color:BLUE  },
  { name:"Anchorage",    desc:"Digital asset banking",         status:"PLANNED", color:BLUE  },
  { name:"Chainlink",    desc:"Decentralized oracle feeds",    status:"PLANNED", color:AMBER },
  { name:"Pyth Network", desc:"High-frequency price oracles",  status:"PLANNED", color:AMBER },
  { name:"First American", desc:"Title & escrow services",     status:"ACTIVE",  color:GREEN },
];

export function TrustStack({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div>
        <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                       textTransform:"uppercase", letterSpacing:"0.15em",
                       marginBottom:"0.75rem" }}>
          TRUST ARCHITECTURE
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
          {TRUST_LAYERS.map(l => (
            <div key={l.layer} style={{ display:"flex", alignItems:"center",
                                         gap:"0.5rem", padding:"0.4rem 0.625rem",
                                         background: CARD,
                                         border:"1px solid " + BORDER,
                                         borderLeft:"2px solid " + l.color,
                                         borderRadius:"3px" }}>
              <span style={{ fontFamily:M, fontSize:"0.28rem",
                              color:"rgba(255,255,255,0.2)" }}>{l.layer}</span>
              <span style={{ fontFamily:S, fontSize:"0.44rem",
                              color:"rgba(255,255,255,0.7)", flex:1 }}>{l.title}</span>
              <span style={{ fontFamily:M, fontSize:"0.26rem", fontWeight:700,
                              color:l.color, textTransform:"uppercase",
                              letterSpacing:"0.08em" }}>{l.status}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:900, margin:"0 auto",
                   padding:"clamp(2rem,5vw,4rem) clamp(1rem,3vw,2rem)" }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:"3rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.34rem", fontWeight:700,
                       color:"rgba(16,185,129,0.5)", textTransform:"uppercase",
                       letterSpacing:"0.2em", marginBottom:"0.75rem" }}>
          VERIFIABLE TRUST INFRASTRUCTURE
        </div>
        <h2 style={{ fontFamily:S, fontSize:"clamp(1.4rem,4vw,2.4rem)", fontWeight:800,
                      color:"#f0f0f0", margin:"0 0 0.75rem", letterSpacing:"-0.02em" }}>
          What stands behind the collateral.
        </h2>
        <p style={{ fontFamily:S, fontSize:"clamp(0.72rem,1.8vw,0.9rem)",
                     color:"rgba(255,255,255,0.3)", maxWidth:540,
                     margin:"0 auto", lineHeight:1.75 }}>
          Abraxas does not issue certificates based on self-reported data.
          Every collateral position is backed by a verified documentation chain —
          legal, custodial, and financial.
        </p>
      </div>

      {/* Trust layers */}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.625rem",
                     marginBottom:"3rem" }}>
        {TRUST_LAYERS.map((l, idx) => (
          <div key={l.layer} style={{
            padding:"1.25rem 1.5rem",
            background: CARD, border:"1px solid " + BORDER,
            borderLeft:"3px solid " + l.color,
            borderRadius:"6px",
            display:"grid",
            gridTemplateColumns:"clamp(40px,6vw,64px) 1fr clamp(120px,20vw,200px)",
            gap:"1rem", alignItems:"start",
          }}>
            {/* Layer number */}
            <div>
              <div style={{ fontFamily:M,
                             fontSize:"clamp(1.2rem,3vw,1.8rem)",
                             fontWeight:900, color:l.color + "30", lineHeight:1 }}>
                {l.layer}
              </div>
            </div>

            {/* Content */}
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                             marginBottom:"0.4rem" }}>
                <span style={{ color:l.color, fontSize:"0.5rem" }}>{l.icon}</span>
                <span style={{ fontFamily:S, fontSize:"clamp(0.8rem,2vw,1rem)",
                                fontWeight:700, color:"#f0f0f0" }}>
                  {l.title}
                </span>
              </div>
              <p style={{ fontFamily:S, fontSize:"clamp(0.68rem,1.6vw,0.8rem)",
                           color:"rgba(255,255,255,0.35)", lineHeight:1.7,
                           margin:"0 0 0.625rem" }}>
                {l.desc}
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem" }}>
                {l.items.map(item => (
                  <span key={item} style={{ padding:"2px 7px", borderRadius:"3px",
                                              background:l.color + "08",
                                              border:"1px solid " + l.color + "20",
                                              fontFamily:M, fontSize:"0.3rem",
                                              color:"rgba(255,255,255,0.35)" }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Status */}
            <div style={{ textAlign:"right" }}>
              <span style={{ padding:"3px 8px", borderRadius:"3px",
                              background:l.color + "12",
                              border:"1px solid " + l.color + "30",
                              fontFamily:M, fontSize:"0.28rem", fontWeight:700,
                              color:l.color, textTransform:"uppercase",
                              letterSpacing:"0.1em" }}>
                {l.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Integrations */}
      <div style={{ padding:"1.5rem",
                     background:CARD, border:"1px solid " + BORDER,
                     borderRadius:"6px" }}>
        <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                       textTransform:"uppercase", letterSpacing:"0.15em",
                       marginBottom:"1rem" }}>
          INFRASTRUCTURE INTEGRATIONS
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
                       gap:"0.5rem" }}>
          {INTEGRATIONS.map(int => (
            <div key={int.name} style={{ padding:"0.75rem", borderRadius:"5px",
                                          border:"1px solid " + BORDER,
                                          background:"rgba(255,255,255,0.02)" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                             alignItems:"center", marginBottom:"0.2rem" }}>
                <span style={{ fontFamily:S, fontSize:"0.72rem",
                                fontWeight:700, color:"#f0f0f0" }}>
                  {int.name}
                </span>
                <span style={{ padding:"1px 5px", borderRadius:"2px",
                                background:int.color + "10",
                                border:"1px solid " + int.color + "25",
                                fontFamily:M, fontSize:"0.24rem", fontWeight:700,
                                color:int.color, textTransform:"uppercase" }}>
                  {int.status}
                </span>
              </div>
              <div style={{ fontFamily:S, fontSize:"0.6rem",
                             color:"rgba(255,255,255,0.25)" }}>
                {int.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
