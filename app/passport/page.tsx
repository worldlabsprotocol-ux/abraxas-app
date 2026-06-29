"use client";
// FILE: app/passport/page.tsx
// Abraxas Passport, STANDALONE identity experience, completely separate
// from the tokenize/asset flow. This is the verification moat.
// Biometric ID → Business Verified → Accredited Investor → Asset Owner.
// Each stamp is earned through a real process, stored on Supabase,
// and eventually issued as a W3C Verifiable Credential signed by Abraxas.

import { useState, useEffect } from "react";
import Link from "next/link";
import { DocumentUpload } from "@/components/passport/DocumentUpload";
import { ReclaimVerifyButton } from "@/components/ReclaimVerifyButton";
import { FoundingVerifiedCard } from "@/components/passport/FoundingVerifiedCard";
import { useReclaimSocialStamp } from "@/lib/useReclaimSocialStamp";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "@/components/redesign/AmbientGlow";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import { type PassportStampKind } from "@/components/identity/PassportStampIcon";
import {
  AbraxasPassport,
  passportStateToStampIds,
  passportWizardToStampId,
  stampIdToPassportWizard,
  type StampId,
} from "@/components/identity/AbraxasPassport";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";
const B = "#3B82F6";
const A = "#F59E0B";
const V = "#8B5CF6";

// This is Veriff's public/publishable API key, not the secret key, it's
// designed to be exposed client-side, same model as a Stripe publishable
// key. If you regenerate it in your Veriff dashboard, swap it in here.
const VERIFF_PUBLIC_API_KEY = "271e98bb-881f-40b9-bf21-94aecff4a846";

// Each stamp is a real verification step with a real process behind it.
// The color of the stamp, the check items, and the CTA all differ per tier.
interface Stamp {
  id: string;
  name: string;
  shortName: string;
  color: string;
  kind: PassportStampKind;
  description: string;
  whatItProves: string;
  requiredDocs: string[];
  processSteps: string[];
  timeEstimate: string;
  regulatoryBasis: string;
}

const STAMPS: Stamp[] = [
  {
    id: "social",
    name: "Social Verified",
    shortName: "Social",
    color: B,
    kind: "social",
    description: "Cryptographically prove a real account on LinkedIn, X, GitHub, or Gmail belongs to you, without handing Abraxas your password. Powered by Reclaim Protocol's zkTLS proofs.",
    whatItProves: "The social account you're claiming is real, active, and actually yours, verified through a cryptographic proof rather than a simple login.",
    requiredDocs: ["An active LinkedIn, X, GitHub, or Gmail account you can log into during the check"],
    processSteps: [
      "Choose which account to verify (LinkedIn, X, GitHub, or Gmail)",
      "A secure verification portal opens in a new tab",
      "Log in normally on that platform's own site, nothing is shared with Abraxas",
      "A cryptographic proof is generated and sent back automatically",
      "Social Verified stamp issued on confirmation",
    ],
    timeEstimate: "Usually under 2 minutes.",
    regulatoryBasis: "Not a regulatory requirement, this is a trust signal layered on top of required verification, not a substitute for it.",
  },
  {
    id: "identity",
    name: "Identity Verified",
    shortName: "ID",
    color: G,
    kind: "identity",
    description: "Abraxas Precheck: a government-issued ID plus a biometric liveness check, processed through Veriff, a certified identity verification provider. Most people clear Precheck in minutes.",
    whatItProves: "You are a real person, the ID belongs to you, and you passed a sanctions and PEP screening.",
    requiredDocs: ["Government-issued photo ID (passport, driver's license, or national ID)", "A camera, liveness check takes about 60 seconds"],
    processSteps: [
      "Enter your email to start Abraxas Precheck",
      "Photograph your ID front and back",
      "Complete a 60-second liveness check (look at camera, turn head)",
      "Precheck returns a result, usually within minutes",
      "Abraxas issues your Identity Verified stamp",
    ],
    timeEstimate: "Most Precheck approvals: under 5 minutes. Manual review cases: up to 1 business day.",
    regulatoryBasis: "FATF-aligned KYC. Veriff is an eIDAS-certified provider, ISO 27001. Abraxas stores only the verification outcome, never raw document data.",
  },
  {
    id: "business",
    name: "Business Verified",
    shortName: "KYB",
    color: B,
    kind: "business",
    description: "Entity existence, beneficial ownership mapping, and operating agreement validation. Required for any business asset submission.",
    whatItProves: "Your company is legally registered, you have authority to act for it, and beneficial ownership is disclosed to Abraxas.",
    requiredDocs: [
      "Articles of Incorporation or LLC Operating Agreement",
      "EIN or equivalent tax ID",
      "Proof of beneficial ownership (anyone owning 25%+ must be listed)",
      "Government ID for each beneficial owner",
    ],
    processSteps: [
      "Submit your entity name and jurisdiction",
      "Upload formation documents",
      "List all beneficial owners (25%+ stake)",
      "Each owner completes Identity Verified step",
      "Abraxas reviews entity documents (1–3 business days)",
      "Business Verified stamp issued on confirmation",
    ],
    timeEstimate: "1–3 business days depending on document clarity and jurisdiction.",
    regulatoryBasis: "FinCEN CDD Rule (31 CFR §1010.230). Wyoming LLCs are fully supported and processed fastest.",
  },
  {
    id: "accredited",
    name: "Accredited Investor",
    shortName: "AI",
    color: A,
    kind: "accredited",
    description: "Self-certification supported by document verification. Qualifies you for Reg D 506(c) investment opportunities on Abraxas.",
    whatItProves: "You meet SEC accreditation standards: either income-based ($200K+ individual / $300K+ joint) or net worth-based ($1M+ excluding primary residence).",
    requiredDocs: [
      "Option 1 (Income): Two years of tax returns or W-2s showing qualifying income",
      "Option 2 (Net Worth): Bank/brokerage statements, property appraisals",
      "Option 3 (Professional): Series 7, 65, or 82 license (active)",
      "Option 4 (Entity): Most entity types with $5M+ in investments",
    ],
    processSteps: [
      "Select your qualification basis",
      "Upload supporting documents",
      "Abraxas or a licensed third-party verifier reviews (CPA/attorney letter accepted)",
      "Accredited Investor stamp issued",
      "Stamp is valid for 90 days per SEC guidance, renewable",
    ],
    timeEstimate: "2–5 business days. CPA/attorney letter speeds this up significantly.",
    regulatoryBasis: "SEC Rule 501(a) of Regulation D. Required for all Reg D 506(c) investment opportunities.",
  },
  {
    id: "asset_owner",
    name: "Asset Owner",
    shortName: "AO",
    color: V,
    kind: "asset_owner",
    description: "Ownership of a specific asset is verified: title, deed, rights chain, or registration confirmed by Abraxas's review team.",
    whatItProves: "You own or have legal authority over the specific asset you've submitted, with a clear chain of title and no undisclosed encumbrances.",
    requiredDocs: [
      "Real estate: deed, title search, and current appraisal",
      "IP/royalties: copyright registration, publishing agreement, or royalty statements",
      "Mineral rights: mineral deed or lease agreement",
      "Business interest: shareholder agreement or membership certificate",
    ],
    processSteps: [
      "Submit your asset through the marketplace",
      "Upload ownership documentation",
      "Abraxas team reviews title chain (3–7 business days)",
      "Independent appraisal or verification check completed",
      "Asset Owner stamp issued per verified asset",
      "Collateral score assigned based on verification depth",
    ],
    timeEstimate: "3–7 business days. Complex title chains take longer.",
    regulatoryBasis: "Asset attestation aligned with UCC Article 9 (personal property) and applicable state recording statutes for real property.",
  },
];

type StampStatus = "earned" | "in_progress" | "not_started";

interface PassportState {
  social:      StampStatus;
  identity:    StampStatus;
  business:    StampStatus;
  accredited:  StampStatus;
  asset_owner: StampStatus;
}

export default function PassportPage() {
  const [email, setEmail]   = useState("");
  const [active, setActive] = useState<string | null>("social");
  const [starting, setStarting] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [passportState, setPassportState] = useState<PassportState>({
    social: "not_started",
    identity: "not_started",
    business: "not_started",
    accredited: "not_started",
    asset_owner: "not_started",
  });

  // Real check against the database, not optimistic UI alone, this
  // is the actual source of truth for whether a Reclaim verification
  // genuinely completed.
  const socialVerified = useReclaimSocialStamp(email || null);
  useEffect(() => {
    if (socialVerified) {
      setPassportState(prev => ({ ...prev, social: "earned" }));
    }
  }, [socialVerified]);

  const earned = Object.values(passportState).filter(s => s === "earned").length;
  const activeStamp = STAMPS.find(s => s.id === active) ?? null;

  // Check real verification status on mount if email is stored
  useEffect(() => {
    const stored = localStorage.getItem("abraxas_email");
    if (stored) {
      setEmail(stored);
      checkStatus(stored);
    }
  }, []);

  async function checkStatus(e: string) {
    try {
      const res = await fetch(`/api/identity/status?email=${encodeURIComponent(e)}`);
      const { status } = await res.json() as { status?: string };
      if (status === "approved") {
        setPassportState(p => ({ ...p, identity: "earned" }));
      } else if (status === "pending") {
        setPassportState(p => ({ ...p, identity: "in_progress" }));
      }
    } catch { /* silent, status is best-effort */ }
  }

  function startIdentityVerification() {
    if (!email.includes("@")) { setError("Enter a valid email first"); return; }
    localStorage.setItem("abraxas_email", email);
    setStarting(true);
    setError(null);

    // Load Veriff's two SDK scripts if they're not already on the page,
    // this is the In-Context flow: it mounts an embedded verification
    // frame right here, no redirect away from Abraxas, and no server
    // env vars needed to trigger it, only the public API key below,
    // which is safe to expose client-side, same model as a Stripe
    // publishable key.
    function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(s);
      });
    }

    Promise.all([
      loadScript("https://cdn.veriff.me/sdk/js/1.5/veriff.min.js"),
      loadScript("https://cdn.veriff.me/incontext/js/v1/veriff.js"),
    ])
      .then(() => {
        // Veriff and window.veriffSDK are loaded onto window by the two
        // scripts above, there's no type definition for them, so this
        // reads from window as any rather than fight the global type
        const w = window as unknown as {
          Veriff: (config: Record<string, unknown>) => { mount: (opts: Record<string, unknown>) => void };
          veriffSDK: { createVeriffFrame: (opts: { url: string }) => void };
        };
        const veriff = w.Veriff({
          host: "https://stationapi.veriff.com",
          apiKey: VERIFF_PUBLIC_API_KEY,
          parentId: "veriff-root",
          onSession: function (err: unknown, response: { verification?: { url?: string } }) {
            setStarting(false);
            if (err || !response?.verification?.url) {
              setError("Could not start verification. Try again shortly.");
              return;
            }
            setPassportState(p => ({ ...p, identity: "in_progress" }));
            w.veriffSDK.createVeriffFrame({ url: response.verification!.url! });
          },
        });
        veriff.mount({ formLabel: { vendorData: email } });
      })
      .catch(() => {
        setStarting(false);
        setError("Could not load the verification widget. Check your connection and try again.");
      });
  }

  const statusColor: Record<StampStatus, string> = {
    earned:       G,
    in_progress:  A,
    not_started:  "var(--text-muted)",
  };

  const statusLabel: Record<StampStatus, string> = {
    earned:       "Earned",
    in_progress:  "In review",
    not_started:  "Not started",
  };

  return (
    <WalletContextProvider>
    <div data-theme="dark" style={{ background:"var(--bg)", minHeight:"100vh",
                   color:"var(--text-primary)", position:"relative", overflowX:"hidden" }}>

      <AmbientGlow />

      {/* Veriff's in-context frame mounts here when verification starts */}
      <div id="veriff-root" />

      <RedesignNav />

      <div style={{ position:"relative", zIndex:1, maxWidth:960, margin:"0 auto",
                     padding:"clamp(2rem,5vw,3rem) clamp(1rem,4vw,2.5rem)" }}>

        {/* Header */}
        <div style={{ marginBottom:"2.5rem" }}>
          <div style={{ fontFamily:S, fontSize:"0.72rem", fontWeight:600,
                         color:G, marginBottom:"0.625rem" }}>
            One credential. Every protocol.
          </div>
          <h1 style={{ fontFamily:S, fontSize:"var(--fs-display)",
                        fontWeight:800, lineHeight:1.0,
                        color:"var(--text-primary)",
                        letterSpacing:"-0.04em", margin:"0 0 1.1rem" }}>
            Get verified once.<br/>
            <span style={{ color:G }}>Use your credential everywhere.</span>
          </h1>
          <p style={{ fontFamily:S, fontSize:"clamp(0.88rem,1.8vw,1rem)",
                       color:"var(--text-secondary)", lineHeight:1.75,
                       maxWidth:560, margin:0 }}>
            Your Abraxas Passport is a verifiable record of who you are, what
            you own, and whether you qualify to invest. Once any stamp is
            earned, you never repeat that verification on Abraxas or any
            integrated platform.
          </p>
        </div>

        {/* Live passport preview — same component as homepage, reflects earned stamps */}
        <div style={{ marginBottom: "2rem" }}>
          <AbraxasPassport
            earnedStamps={passportStateToStampIds(passportState)}
            activeStamp={active ? passportWizardToStampId(active) : null}
            onStampClick={(id) => setActive(stampIdToPassportWizard(id))}
            onGetVerified={() => setActive("identity")}
            showHeadline={false}
            showVision={false}
            didHint={email.includes("@") ? `did:email:${email.split("@")[0].slice(0, 6)}…` : undefined}
          />
        </div>

        {/* Stamp wizard */}
        <div style={{ background:"var(--surface-raised)",
                       border:"1px solid var(--border)", borderRadius:16,
                       padding:"1.5rem", marginBottom:"2rem",
                       display:"flex", flexDirection:"column", gap:"1.25rem" }}>
          {/* Email / identity anchor */}
          <div>
            <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:600,
                           color:"var(--text-primary)", marginBottom:"0.5rem" }}>
              Your Passport is tied to your email
            </div>
            <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                placeholder="your@email.com"
                style={{ flex:1, minWidth:200, padding:"0.65rem 0.875rem",
                          borderRadius:8, border:"1px solid var(--border)",
                          background:"var(--surface)", color:"var(--text-primary)",
                          fontFamily:S, fontSize:"16px" }}
              />
            </div>
            {error && <div style={{ fontFamily:S, fontSize:"0.72rem",
                                     color:"#EF4444", marginTop:"0.375rem" }}>
              {error}
            </div>}
          </div>

          {/* Progress summary */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem",
                         flexWrap:"wrap" }}>
            <div style={{ fontFamily:M, fontSize:"1.6rem", fontWeight:700, color:G }}>
              {earned}/{STAMPS.length}
            </div>
            <div>
              <div style={{ fontFamily:S, fontSize:"0.88rem", fontWeight:600,
                             color:"var(--text-primary)" }}>
                Stamps earned
              </div>
              <div style={{ fontFamily:S, fontSize:"0.72rem",
                             color:"var(--text-secondary)" }}>
                Each stamp is a verified credential backed by documentation.
              </div>
            </div>
          </div>

          <FoundingVerifiedCard
            walletOrContext={email || "anon"}
            hasSocial={passportState.social === "earned"}
            hasIdentity={passportState.identity === "earned"}
          />
        </div>

        {/* Expanded stamp detail, shows real process steps */}
        {activeStamp && (() => {
          const status = passportState[activeStamp.id as keyof PassportState];
          return (
            <div style={{ background:"var(--surface-raised)",
                           border:`1.5px solid ${activeStamp.color}40`,
                           borderRadius:16, padding:"1.5rem",
                           marginBottom:"2rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                             alignItems:"flex-start", marginBottom:"1.25rem",
                             flexWrap:"wrap", gap:"0.75rem" }}>
                <div>
                  <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                                 color:activeStamp.color, marginBottom:"0.25rem" }}>
                    {statusLabel[status]}
                  </div>
                  <div style={{ fontFamily:S, fontSize:"1.25rem", fontWeight:700,
                                 color:"var(--text-primary)" }}>
                    {activeStamp.name}
                  </div>
                </div>
                <div style={{ fontFamily:S, fontSize:"0.68rem",
                               color:"var(--text-muted)",
                               background:"var(--surface-raised)",
                               padding:"0.375rem 0.75rem", borderRadius:20,
                               border:"1px solid var(--border)" }}>
                  ⏱ {activeStamp.timeEstimate}
                </div>
              </div>

              <p style={{ fontFamily:S, fontSize:"0.85rem",
                           color:"var(--text-secondary)", lineHeight:1.7,
                           margin:"0 0 1.25rem" }}>
                {activeStamp.description}
              </p>

              <div style={{ display:"grid",
                             gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
                             gap:"1rem", marginBottom:"1.25rem" }}>
                {/* What it proves */}
                <div style={{ background:"var(--surface)", borderRadius:10,
                               padding:"1rem", border:"1px solid var(--border)" }}>
                  <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700,
                                 color:"var(--text-primary)", marginBottom:"0.5rem" }}>
                    What this proves
                  </div>
                  <p style={{ fontFamily:S, fontSize:"0.78rem",
                               color:"var(--text-secondary)", lineHeight:1.65,
                               margin:0 }}>
                    {activeStamp.whatItProves}
                  </p>
                </div>

                {/* Required docs */}
                <div style={{ background:"var(--surface)", borderRadius:10,
                               padding:"1rem", border:"1px solid var(--border)" }}>
                  <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700,
                                 color:"var(--text-primary)", marginBottom:"0.5rem" }}>
                    What you'll need
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem" }}>
                    {activeStamp.requiredDocs.map(d => (
                      <div key={d} style={{ display:"flex", gap:"0.375rem",
                                             alignItems:"flex-start" }}>
                        <span style={{ color:activeStamp.color, flexShrink:0,
                                        marginTop:2 }}>·</span>
                        <span style={{ fontFamily:S, fontSize:"0.72rem",
                                        color:"var(--text-secondary)",
                                        lineHeight:1.5 }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Process steps */}
              <div style={{ background:"var(--surface)", borderRadius:10,
                             padding:"1rem", border:"1px solid var(--border)",
                             marginBottom:"1rem" }}>
                <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700,
                               color:"var(--text-primary)", marginBottom:"0.75rem" }}>
                  How it works, step by step
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                  {activeStamp.processSteps.map((step, i) => (
                    <div key={step} style={{ display:"flex", gap:"0.75rem",
                                             paddingBottom: i < activeStamp.processSteps.length - 1 ? "0.625rem" : 0 }}>
                      <div style={{ width:22, height:22, borderRadius:"50%",
                                     background:`${activeStamp.color}15`,
                                     border:`1.5px solid ${activeStamp.color}40`,
                                     display:"flex", alignItems:"center",
                                     justifyContent:"center", flexShrink:0,
                                     fontFamily:M, fontSize:"0.6rem",
                                     fontWeight:700, color:activeStamp.color }}>
                        {i + 1}
                      </div>
                      <span style={{ fontFamily:S, fontSize:"0.78rem",
                                      color:"var(--text-secondary)",
                                      lineHeight:1.6, paddingTop:2 }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regulatory basis */}
              <div style={{ fontFamily:S, fontSize:"0.7rem",
                             color:"var(--text-muted)", lineHeight:1.6,
                             marginBottom:"1.25rem" }}>
                <strong style={{ color:"var(--text-secondary)" }}>Regulatory basis:</strong>{" "}
                {activeStamp.regulatoryBasis}
              </div>

              {/* Action */}
              {activeStamp.id === "social" && status !== "earned" && (
                <div>
                  <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap" }}>
                    <ReclaimVerifyButton provider="linkedin" label="LinkedIn" userId={email} />
                    <ReclaimVerifyButton provider="twitter" label="X" userId={email} />
                    <ReclaimVerifyButton provider="github" label="GitHub" userId={email} />
                    <ReclaimVerifyButton provider="gmail" label="Gmail" userId={email} />
                  </div>
                  <div style={{ fontFamily:S, fontSize:"0.72rem",
                                 color:"var(--text-muted)", marginTop:"0.75rem", maxWidth:420 }}>
                    Each opens that platform's own login page in a new tab.
                    Abraxas never sees your password, only a cryptographic
                    proof that the account is real and active.
                  </div>
                </div>
              )}
              {activeStamp.id === "identity" && status !== "earned" && (
                <div>
                  <button onClick={startIdentityVerification} disabled={starting}
                    style={{ padding:"0.75rem 2rem", borderRadius:8, border:"none",
                              background:G, color:"#000", fontFamily:S,
                              fontSize:"0.88rem", fontWeight:700, cursor:"pointer",
                              opacity: starting ? 0.6 : 1 }}>
                    {starting ? "Starting..." : "Start Abraxas Precheck →"}
                  </button>
                  {error && (
                    <div style={{ fontFamily:S, fontSize:"0.76rem", color:"#EF4444",
                                   marginTop:"0.625rem", maxWidth:420, lineHeight:1.5 }}>
                      {error}
                    </div>
                  )}
                  <div style={{ marginTop:"1.25rem", paddingTop:"1.25rem",
                                 borderTop:"1px solid var(--border)" }}>
                    <div style={{ fontFamily:S, fontSize:"0.72rem",
                                   color:"var(--text-muted)", marginBottom:"0.75rem" }}>
                      Precheck unavailable, or you'd rather not wait? Upload your ID
                      directly and our team verifies it by hand.
                    </div>
                    <DocumentUpload email={email} stampId="identity" color={activeStamp.color} />
                  </div>
                </div>
              )}
              {activeStamp.id !== "identity" && activeStamp.id !== "social" && status !== "earned" && (
                <div>
                  <DocumentUpload email={email} stampId={activeStamp.id} color={activeStamp.color} />
                  <Link href="mailto:verify@abraxas-app.vercel.app?subject=Passport%20Verification%20Request"
                    style={{ display:"inline-block", padding:"0.75rem 2rem",
                              borderRadius:8, border:`1.5px solid ${activeStamp.color}`,
                              background:"transparent", color:activeStamp.color,
                              fontFamily:S, fontSize:"0.88rem", fontWeight:700,
                              textDecoration:"none" }}>
                    Already uploaded? Let us know you're ready for review →
                  </Link>
                </div>
              )}
              {status === "earned" && (
                <div style={{ padding:"0.75rem 1.5rem", borderRadius:8,
                               background:`${activeStamp.color}12`,
                               border:`1.5px solid ${activeStamp.color}40`,
                               display:"inline-flex", alignItems:"center",
                               gap:"0.5rem" }}>
                  <span style={{ color:activeStamp.color, fontSize:"1rem" }}>✓</span>
                  <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:600,
                                  color:activeStamp.color }}>
                    This credential is on your Passport.
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Credential architecture — honest technical surface for integrators */}
        <div style={{ background:"var(--surface-raised)",
                       border:"1px solid var(--border)", borderRadius:16,
                       padding:"1.5rem", marginBottom:"2rem" }}>
          <div style={{ fontFamily:M, fontSize:"0.62rem", fontWeight:700,
                         color:G, letterSpacing:"0.12em", textTransform:"uppercase",
                         marginBottom:"0.5rem" }}>
            Credential architecture
          </div>
          <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                         color:"var(--text-primary)", marginBottom:"1rem" }}>
            How the passport works under the hood
          </div>
          <div style={{ display:"grid",
                         gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",
                         gap:"0.75rem", marginBottom:"1rem" }}>
            {[
              { title:"Issuance", body:"W3C Verifiable Credential v2.0, signed Ed25519 by Abraxas issuer key. Raw documents stay with Veriff or manual review — only verification outcome is credentialized." },
              { title:"On-chain anchor", body:"Attestation hash anchored on Solana Mainnet. Planned: Passport PDA per holder with compact stamp bitmap or Merkle root for CPI-friendly verification by external programs." },
              { title:"Stamp model", body:"11 gates map to verifiable facts: identity, KYB, property title, lending eligibility, etc. Each stamp updates the passport root when earned — not a UI checkbox." },
              { title:"Portability", body:"Third parties verify via signed presentation today; on-chain CPI instruction + published IDL on roadmap. No re-KYC, no document re-upload." },
            ].map(c => (
              <div key={c.title} style={{ background:"var(--surface)",
                                           border:"1px solid var(--border)",
                                           borderRadius:10, padding:"1rem" }}>
                <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:700,
                               color:"var(--text-primary)", marginBottom:"0.375rem" }}>
                  {c.title}
                </div>
                <p style={{ fontFamily:S, fontSize:"0.72rem",
                             color:"var(--text-secondary)", lineHeight:1.65, margin:0 }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap" }}>
            <Link href="/docs/architecture" style={{ padding:"0.6rem 1.1rem", borderRadius:999,
                background:G, color:"#000", fontFamily:S, fontSize:"0.82rem",
                fontWeight:700, textDecoration:"none" }}>
              Read architecture spec →
            </Link>
            <Link href="/security" style={{ padding:"0.6rem 1.1rem", borderRadius:999,
                border:"1px solid var(--border)", background:"var(--surface)",
                color:"var(--text-secondary)", fontFamily:S, fontSize:"0.82rem",
                fontWeight:600, textDecoration:"none" }}>
              Security & key management
            </Link>
          </div>
        </div>

        {/* What happens to your credential */}
        <div style={{ background:"var(--surface-raised)",
                       border:"1px solid var(--border)", borderRadius:16,
                       padding:"1.5rem", marginBottom:"2rem" }}>
          <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                         color:"var(--text-primary)", marginBottom:"1rem" }}>
            What Abraxas does with your credential
          </div>
          <div style={{ display:"grid",
                         gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
                         gap:"0.75rem" }}>
            {[
              { title:"We store proof, not documents",
                body:"Your Passport contains a cryptographic stamp showing you passed. Your ID photos and documents are held by Veriff (a certified provider) and never exposed on a blockchain or to investors." },
              { title:"Stamps are non-transferable",
                body:"A Passport stamp cannot be sold, assigned, or used by another person. It's cryptographically linked to your email and biometric data." },
              { title:"Verification expires only when standards change",
                body:"Identity stamps don't expire unless Abraxas upgrades its verification standard. Accredited Investor stamps follow SEC guidance (90 days for self-certification)." },
              { title:"Your credential can travel",
                body:"A future Abraxas integration means other platforms can check your stamps instead of running their own KYC. You present a proof, not your raw data." },
            ].map(c => (
              <div key={c.title} style={{ background:"var(--surface)",
                                           border:"1px solid var(--border)",
                                           borderRadius:10, padding:"1rem" }}>
                <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:700,
                               color:"var(--text-primary)", marginBottom:"0.375rem" }}>
                  {c.title}
                </div>
                <p style={{ fontFamily:S, fontSize:"0.72rem",
                             color:"var(--text-secondary)", lineHeight:1.65,
                             margin:0 }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Clear CTA back to marketplace, not forced into it */}
        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap",
                       paddingBottom:"3rem" }}>
          <Link href="/terminal" style={{ padding:"0.75rem 1.5rem", borderRadius:8,
              background:G, color:"#000", fontFamily:S, fontSize:"0.88rem",
              fontWeight:700, textDecoration:"none" }}>
            View marketplace →
          </Link>
          <Link href="/terminal" style={{ padding:"0.75rem 1.5rem", borderRadius:8,
              border:"1px solid var(--border)", background:"var(--surface)",
              color:"var(--text-secondary)", fontFamily:S, fontSize:"0.88rem",
              fontWeight:600, textDecoration:"none" }}>
            Submit an asset
          </Link>
        </div>
      </div>
      <RedesignFooter />
    </div>
    </WalletContextProvider>
  );
}
