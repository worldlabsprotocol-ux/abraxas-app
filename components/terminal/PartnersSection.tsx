"use client";
// FILE: components/terminal/PartnersSection.tsx

import { useState } from "react";
import { BecomeAPartner } from "@/components/BecomeAPartner";
import { ContactForm } from "@/components/ContactForm";
import { M, S, G, B, W, BDR, CARD } from "./tokens";
import { Label, Button, ScrollFade } from "./ui";

function DisasterReliefCard() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div style={{ padding:"1rem 1.125rem", background:CARD,
                   border:`1px solid ${BDR}`, borderRadius:8 }}>
      <div style={{ display:"flex", alignItems:"flex-start",
                     justifyContent:"space-between",
                     flexWrap:"wrap", gap:"0.75rem", marginBottom: showForm ? "1.25rem" : 0 }}>
        <div>
          <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                         color:"#F59E0B", marginBottom:"0.375rem" }}>
            New verification vertical
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(0.9rem,1.9vw,1.05rem)",
                         fontWeight:700, color:W, marginBottom:"0.375rem" }}>
            Disaster and relief fund auditing.
          </div>
          <p style={{ fontFamily:S, fontSize:"0.75rem",
                       color:"rgba(242,246,243,0.45)", lineHeight:1.65,
                       maxWidth:520, margin:"0 0 0.625rem" }}>
            The same verification model applied to public and nonprofit
            relief funds: an independent auditor confirms a disbursement
            was used as intended, and Abraxas issues a portable
            credential proving it. Built for organizations distributing
            recovery funds after a disaster who need a verifiable,
            public record of where the money actually went.
          </p>
          <p style={{ fontFamily:S, fontSize:"0.72rem",
                       color:"rgba(242,246,243,0.35)", lineHeight:1.6,
                       maxWidth:520, margin:0 }}>
            If your organization has a relief fund disbursement contract,
            submit it for review below. Treated with the same rigor as
            any other contract, the funds need a clear, verifiable record
            of where they actually went.
          </p>
        </div>
        <Button onClick={() => setShowForm(s => !s)}
                variant="outline" color="#F59E0B" size="sm">
          {showForm ? "CLOSE" : "SUBMIT FOR REVIEW"}
        </Button>
      </div>
      {showForm && (
        <ContactForm
          category="relief-audit"
          color="#F59E0B"
          organizationLabel="Organization or fund name"
          placeholder="Describe the fund, the disbursement plan, and what you need reviewed"
        />
      )}
    </div>
  );
}

export function PartnersSection() {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <ScrollFade>
      <Label>Verification Partners</Label>

      {/* Market validation, real third-party proof the category is real */}
      <div style={{ padding:"0.875rem 1.125rem", borderRadius:8,
                     border:`1px solid ${G}30`,
                     background:`${G}08`, marginBottom:"1rem" }}>
        <div style={{ fontFamily:S, fontSize:"0.78rem", color:"rgba(242,246,243,0.6)" }}>
          Tokenized real-world assets on Sui hit{" "}
          <span style={{ color:G, fontWeight:700 }}>$213M</span> in daily
          trading volume this week, more than Coinbase or Kraken moved in
          the same period. This isn't a niche idea, the category is real
          and it's already proving itself at scale.
        </div>
      </div>

      <div style={{ padding:"1rem 1.125rem", background:CARD,
                     border:`1px solid ${BDR}`, borderRadius:8,
                     marginBottom:"1.5rem" }}>
        {/* Utilia custody partnership badge */}
        <div style={{ padding:"0.625rem 0.875rem", borderRadius:6,
                       background:"rgba(59,130,246,0.07)",
                       border:"1px solid rgba(59,130,246,0.25)",
                       display:"flex", alignItems:"center",
                       gap:"0.75rem", flexWrap:"wrap",
                       marginBottom:"0.875rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <div style={{ width:8, height:8, borderRadius:"50%",
                           background:B, boxShadow:`0 0 5px ${B}` }} />
            <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                            color:B, letterSpacing:"0.12em",
                            textTransform:"uppercase" }}>
              CUSTODY PARTNER · UTILIA
            </span>
          </div>
          <span style={{ fontFamily:S, fontSize:"0.7rem",
                          color:"rgba(242,246,243,0.4)", lineHeight:1.5 }}>
            Bank-grade secure storage for assets verified on Abraxas.
            Stronger protection than a typical browser wallet or seed phrase.
          </span>
          <Button href="https://utila.io" variant="outline" color={B} size="sm">
            UTILA.IO
          </Button>
        </div>

        {/* CV5 Capital, fund structuring partnership */}
        <div style={{ padding:"0.625rem 0.875rem", borderRadius:6,
                       background:"rgba(139,92,246,0.07)",
                       border:"1px solid rgba(139,92,246,0.25)",
                       display:"flex", alignItems:"center",
                       gap:"0.75rem", flexWrap:"wrap",
                       marginBottom:"0.875rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <div style={{ width:8, height:8, borderRadius:"50%",
                           background:"#8B5CF6", boxShadow:"0 0 5px #8B5CF6" }} />
            <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                            color:"#8B5CF6", letterSpacing:"0.12em",
                            textTransform:"uppercase" }}>
              FUND STRUCTURE PARTNER · CV5 CAPITAL
            </span>
          </div>
          <span style={{ fontFamily:S, fontSize:"0.7rem",
                          color:"rgba(242,246,243,0.4)", lineHeight:1.5 }}>
            CIMA-regulated fund structuring, supporting Abraxas's
            institutional-grade verification standard.
          </span>
        </div>

        {/* HeroSwap partnership badge */}
        <div style={{ padding:"0.625rem 0.875rem", borderRadius:6,
                       background:"rgba(16,185,129,0.07)",
                       border:"1px solid rgba(16,185,129,0.25)",
                       display:"flex", alignItems:"center",
                       gap:"0.75rem", flexWrap:"wrap",
                       marginBottom:"0.875rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <div style={{ width:8, height:8, borderRadius:"50%",
                           background:G, boxShadow:`0 0 5px ${G}` }} />
            <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                            color:G, letterSpacing:"0.12em",
                            textTransform:"uppercase" }}>
              SWAP PARTNER · HEROSWAP
            </span>
          </div>
          <span style={{ fontFamily:S, fontSize:"0.7rem",
                          color:"rgba(242,246,243,0.4)", lineHeight:1.5 }}>
            Instant cross-chain swaps, no signup required. A general
            crypto utility, separate from Abraxas's verified asset investing.
          </span>
          <Button href="/swap" variant="outline" color={G} size="sm">
            TRY SWAP
          </Button>
        </div>
        <div style={{ display:"flex", alignItems:"flex-start",
                       justifyContent:"space-between",
                       flexWrap:"wrap", gap:"0.75rem" }}>
          <div>
            <div style={{ fontFamily:S, fontSize:"clamp(0.92rem,2vw,1.15rem)",
                           fontWeight:800, color:W, marginBottom:"0.25rem" }}>
              Join the verification network.
            </div>
            <p style={{ fontFamily:S, fontSize:"0.75rem",
                         color:"rgba(242,246,243,0.45)", lineHeight:1.65,
                         maxWidth:520, margin:0 }}>
              Abraxas partners are the trusted professionals behind every verified asset,
              appraisers, attorneys, title companies, and auditors who validate the
              claims that make on-chain collateral real.
            </p>
            <a href="/partners" style={{ fontFamily:S, fontSize:"0.78rem", color:G,
                                           textDecoration:"underline", display:"inline-block",
                                           marginTop:"0.5rem" }}>
              View full partner directory →
            </a>
          </div>
          <BecomeAPartner />
        </div>
      </div>

      {/* Disaster & relief fund auditing. positioning + real intake, no client yet */}
      <DisasterReliefCard />
      </ScrollFade>
    </div>
  );
}
