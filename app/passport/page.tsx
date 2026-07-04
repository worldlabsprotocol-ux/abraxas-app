"use client";
// FILE: app/passport/page.tsx
// Abraxas Passport. Sui-native verification via zkLogin + Veriff stamps.

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { DocumentUpload } from "@/components/passport/DocumentUpload";
import { FoundingVerifiedCard } from "@/components/passport/FoundingVerifiedCard";
import { SuiWalletCreatedCard } from "@/components/passport/SuiWalletCreatedCard";
import { PassportWalkthrough } from "@/components/passport/PassportWalkthrough";
import { PassportCompletionDashboard } from "@/components/passport/PassportCompletionDashboard";
import { VerifyStepRail } from "@/components/passport/VerifyStepRail";
import { PassportCredentialBanner } from "@/components/passport/PassportCredentialBanner";
import { PassportIntentCard } from "@/components/passport/PassportIntentCard";
import { PassportTrustCard } from "@/components/passport/PassportTrustCard";
import { VeriffDeviceHint } from "@/components/passport/VeriffDeviceHint";
import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { usePassportVerification } from "@/lib/hooks/usePassportVerification";
import { AmbientGlow } from "@/components/redesign/AmbientGlow";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import { type PassportStampKind } from "@/components/identity/PassportStampIcon";
import {
  AbraxasPassport,
  passportStateToStampIds,
  passportWizardToStampId,
  stampIdToPassportWizard,
} from "@/components/identity/AbraxasPassport";
import { SuiIntegrationsPanel } from "@/components/sui/SuiIntegrationsPanel";
import { SuiDevnetPassportPanel } from "@/components/passport/SuiDevnetPassportPanel";
import { DeveloperDetails } from "@/components/redesign/DeveloperDetails";
import { Btn } from "@/components/redesign/ui";
import { consumerCopy } from "@/lib/consumerCopy";
import { computePassportCompletion, resolveFlowStep } from "@/lib/passportCompletion";
import { useQuery } from "@tanstack/react-query";
import { fetchTrustStatus, passportQueryKeys } from "@/lib/api/passport";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";
const B = "#3B82F6";
const A = "#F59E0B";
const V = "#8B5CF6";

const VERIFF_PUBLIC_API_KEY = "271e98bb-881f-40b9-bf21-94aecff4a846"; // legacy; server create-session preferred

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
    id: "identity",
    name: "Identity Verified",
    shortName: "ID",
    color: G,
    kind: "identity",
    description: "Government ID plus a quick selfie check through a licensed provider. Your stamp is tied to the account you created when you signed in with Google.",
    whatItProves: "You are a real person, the ID belongs to you, and you passed standard sanctions screening — linked to your Abraxas account.",
    requiredDocs: ["Government-issued photo ID (passport, driver's license, or national ID)", "A camera — the selfie check takes about 60 seconds"],
    processSteps: [
      "Sign in with Google to create your Abraxas account",
      "Start the ID check — your account is linked automatically",
      "Photograph your ID front and back",
      "Complete a 60-second selfie check",
      "Results usually return within minutes",
      "Abraxas adds your Identity Verified stamp",
    ],
    timeEstimate: "Most approvals: under 5 minutes. Manual review: up to 1 business day.",
    regulatoryBasis: "FATF-aligned identity check via a licensed provider. Abraxas stores only the verification outcome — never raw document data.",
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
      "Complete Identity Verified first (Google sign-in + Precheck)",
      "Submit your entity name and jurisdiction",
      "Upload formation documents",
      "List all beneficial owners (25%+ stake)",
      "Each owner completes Identity Verified",
      "Abraxas reviews entity documents (1–3 business days)",
      "Business Verified stamp issued on confirmation",
    ],
    timeEstimate: "1–3 business days depending on document clarity and jurisdiction.",
    regulatoryBasis: "FinCEN CDD Rule (31 CFR §1010.230). Wyoming LLCs are fully supported and processed fastest.",
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
      "Complete Identity Verified (and Business Verified if applicable)",
      "Submit your asset through the marketplace",
      "Upload ownership documentation",
      "Abraxas team reviews title chain (3–7 business days)",
      "Independent appraisal or verification check completed",
      "Asset Owner stamp issued per verified asset",
    ],
    timeEstimate: "3–7 business days. Complex title chains take longer.",
    regulatoryBasis: "Asset attestation aligned with UCC Article 9 (personal property) and applicable state recording statutes for real property.",
  },
];

type StampStatus = "earned" | "in_progress" | "not_started";

interface PassportState {
  identity: StampStatus;
  business: StampStatus;
  asset_owner: StampStatus;
}

export default function PassportPage() {
  return (
    <SuiAuthProvider>
      <Suspense fallback={null}>
        <PassportPageInner />
      </Suspense>
    </SuiAuthProvider>
  );
}

function PassportPageInner() {
  const searchParams = useSearchParams();
  const { suiAddress, session } = useSuiAuth();
  const email = session?.email ?? "";
  const [active, setActive] = useState<string | null>("wallet");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passportState, setPassportState] = useState<PassportState>({
    identity: "not_started",
    business: "not_started",
    asset_owner: "not_started",
  });

  const {
    identityStatus,
    via,
    credential,
    verifyState,
    verifyResult,
    onChain,
    isRefreshing,
    isProvisioning,
    provisionError,
    isPolling,
    refresh,
    retryProvision,
    syncMessage,
    isLoading: verificationLoading,
  } = usePassportVerification(suiAddress, email || null);

  const { data: trustData } = useQuery({
    queryKey: suiAddress ? passportQueryKeys.trust(suiAddress) : ["passport", "trust", "none"],
    queryFn: () => fetchTrustStatus(suiAddress!),
    enabled: Boolean(suiAddress),
  });

  const hasCredential = Boolean(credential) && identityStatus === "earned";

  const completion = useMemo(
    () =>
      computePassportCompletion({
        walletDone: Boolean(suiAddress),
        identityStatus,
        credentialActive: hasCredential,
        verifyState,
        onChain,
        intentProofs: trustData?.intent.proofs_count ?? 0,
        stamps: passportState,
      }),
    [suiAddress, identityStatus, hasCredential, verifyState, onChain, trustData, passportState],
  );

  const currentFlowStep = resolveFlowStep(completion);

  function scrollToFlowStep(step: 1 | 2 | 3 | 4) {
    document.getElementById(`passport-step-${step}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  useEffect(() => {
    setPassportState(prev => ({
      ...prev,
      identity:
        identityStatus === "earned" && (onChain?.stamps_complete || !onChain?.issuer_configured)
          ? "earned"
          : identityStatus === "earned" && isProvisioning
            ? "in_progress"
            : identityStatus === "earned"
              ? "earned"
              : identityStatus === "pending" ? "in_progress"
              : identityStatus === "declined" ? "not_started"
              : prev.identity === "earned" ? "earned" : "not_started",
    }));
  }, [identityStatus, onChain?.stamps_complete, onChain?.issuer_configured, isProvisioning]);

  useEffect(() => {
    if (searchParams.get("signed_in") === "1") refresh();
  }, [searchParams, refresh]);

  const walletDone = Boolean(suiAddress);
  const earned = Object.values(passportState).filter(s => s === "earned").length;
  const activeStamp = active === "wallet" ? null : STAMPS.find(s => s.id === active) ?? null;

  const enhancedTrust = identityStatus === "earned" && Boolean(credential);

  const showVeriffHint = identityStatus === "pending" || passportState.identity === "in_progress" || starting;

  const loadVeriffScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });

  async function startIdentityVerification() {
    if (!suiAddress) {
      setError("Sign in with Google first to create your account.");
      setActive("wallet");
      return;
    }
    if (!email.includes("@")) {
      setError("Your Google account must include an email for ID verification.");
      return;
    }
    setStarting(true);
    setError(null);

    try {
      const sessionRes = await fetch("/api/idv/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sui_address: suiAddress,
          document_type: "PASSPORT",
        }),
      });
      const sessionData = await sessionRes.json() as {
        session_url?: string | null;
        session_id?: string;
        error?: string;
        is_mock?: boolean;
      };

      if (!sessionRes.ok || !sessionData.session_url) {
        setError(sessionData.error ?? "Could not start ID verification. Try again in a moment.");
        return;
      }

      setPassportState(p => ({ ...p, identity: "in_progress" }));
      refresh();

      await loadVeriffScript("https://cdn.veriff.me/incontext/js/v1/veriff.js");
      const w = window as unknown as {
        veriffSDK: { createVeriffFrame: (opts: { url: string }) => void };
      };
      w.veriffSDK.createVeriffFrame({ url: sessionData.session_url });
    } catch {
      setError("Could not load the verification widget. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  const statusColor: Record<StampStatus, string> = {
    earned: G,
    in_progress: A,
    not_started: "var(--text-muted)",
  };

  const statusLabel: Record<StampStatus, string> = {
    earned: "Earned",
    in_progress: "In review",
    not_started: "Not started",
  };

  const railEarned: Record<string, StampStatus> = {
    identity: passportState.identity,
    business: passportState.business,
    asset_owner: passportState.asset_owner,
  };

  return (
    <div data-theme="dark" style={{ background:"var(--bg)", minHeight:"100vh",
                   color:"var(--text-primary)", position:"relative", overflowX:"hidden" }}>

      <AmbientGlow />
      <div id="veriff-root" />
      <VeriffDeviceHint visible={showVeriffHint} />
      <RedesignNav />

      <div style={{ position:"relative", zIndex:1, maxWidth:960, margin:"0 auto",
                     padding:"clamp(2rem,5vw,3rem) clamp(1rem,4vw,2.5rem)" }}>

        <div style={{ marginBottom:"2.5rem" }}>
          <div style={{ fontFamily:S, fontSize:"0.72rem", fontWeight:600, color:G, marginBottom:"0.625rem" }}>
            {consumerCopy.passport.eyebrow}
          </div>
          <h1 style={{ fontFamily:S, fontSize:"var(--fs-display)", fontWeight:800, lineHeight:1.0,
                        color:"var(--text-primary)", letterSpacing:"-0.04em", margin:"0 0 1.1rem" }}>
            Sign in.<br/>
            <span style={{ color:G }}>Transact now. Verify when you need more.</span>
          </h1>
          <p style={{ fontFamily:S, fontSize:"clamp(0.88rem,1.8vw,1rem)",
                       color:"var(--text-secondary)", lineHeight:1.75, maxWidth:560, margin:0 }}>
            {consumerCopy.passport.subhead}
          </p>
        </div>

        <PassportCompletionDashboard
          input={{
            walletDone,
            identityStatus,
            credentialActive: hasCredential,
            verifyState,
            onChain,
            intentProofs: trustData?.intent.proofs_count ?? 0,
            stamps: passportState,
          }}
          loading={verificationLoading}
          onItemClick={scrollToFlowStep}
        />

        <PassportWalkthrough
          walletDone={walletDone}
          suiAddress={suiAddress}
          email={email}
          identityStatus={identityStatus}
          credential={credential}
          verifyState={verifyState}
          isPolling={isPolling}
          isRefreshing={isRefreshing}
          starting={starting}
          error={error}
          onStartIdCheck={startIdentityVerification}
          onRefresh={refresh}
          onChain={onChain}
          intentProofs={trustData?.intent.proofs_count ?? 0}
          stamps={passportState}
        />

        <VerifyStepRail
          walletDone={walletDone}
          active={active}
          earned={railEarned}
          enhancedTrust={enhancedTrust}
          verifyState={verifyState}
          currentFlowStep={currentFlowStep}
          onStepClick={scrollToFlowStep}
        />

        {walletDone && (
          <div style={{ marginBottom:"2rem" }}>
            <SuiWalletCreatedCard suiAddress={suiAddress!} email={email} />
          </div>
        )}

        <PassportTrustCard suiAddress={suiAddress} completionPercent={completion.percent} />

        <PassportIntentCard suiAddress={suiAddress} />

        <PassportCredentialBanner
          identityStatus={identityStatus}
          via={via}
          credential={credential}
          verifyState={verifyState}
          verifyResult={verifyResult}
          onChain={onChain}
          isProvisioning={isProvisioning}
          provisionError={provisionError}
          onRetryProvision={retryProvision}
          isRefreshing={isRefreshing}
          isPolling={isPolling}
          onRefresh={refresh}
          syncMessage={syncMessage}
        />

        <div style={{ marginBottom:"2rem" }}>
          <AbraxasPassport
            suiAddress={suiAddress}
            earnedStamps={passportStateToStampIds(passportState)}
            activeStamp={active && active !== "wallet" ? passportWizardToStampId(active) : null}
            onStampClick={(id) => setActive(stampIdToPassportWizard(id))}
            onGetVerified={() => walletDone ? setActive("identity") : setActive("wallet")}
            showHeadline={false}
            showVision={false}
          />
        </div>

        <div style={{ background:"var(--surface-raised)", border:"1px solid var(--border)",
                       borderRadius:16, padding:"1.5rem", marginBottom:"2rem",
                       display:"flex", flexDirection:"column", gap:"1.25rem" }}>

          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", flexWrap:"wrap" }}>
            <div style={{ fontFamily:M, fontSize:"1.6rem", fontWeight:700, color:G }}>
              {earned}/{STAMPS.length}
            </div>
            <div>
              <div style={{ fontFamily:S, fontSize:"0.88rem", fontWeight:600, color:"var(--text-primary)" }}>
                Stamps earned
              </div>
              <div style={{ fontFamily:S, fontSize:"0.72rem", color:"var(--text-secondary)" }}>
                Identity → Business → Asset Owner. Each stamp is a verified credential.
              </div>
            </div>
          </div>

          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
            {STAMPS.map(stamp => {
              const status = passportState[stamp.id as keyof PassportState];
              const isActive = active === stamp.id;
              return (
                <button key={stamp.id} onClick={() => setActive(stamp.id)}
                  style={{
                    padding:"0.5rem 0.875rem", borderRadius:999, cursor:"pointer",
                    border:`1.5px solid ${isActive ? stamp.color : "var(--border)"}`,
                    background: isActive ? `${stamp.color}15` : "var(--surface)",
                    color: status === "earned" ? stamp.color : "var(--text-secondary)",
                    fontFamily:S, fontSize:"0.78rem", fontWeight:600,
                  }}>
                  {stamp.shortName}
                  {status === "earned" && " ✓"}
                </button>
              );
            })}
          </div>

          {error && (
            <div style={{ fontFamily:S, fontSize:"0.72rem", color:"#EF4444" }}>{error}</div>
          )}

          <FoundingVerifiedCard
            walletOrContext={(suiAddress ?? email) || "anon"}
            hasWallet={walletDone}
            hasIdentity={passportState.identity === "earned"}
          />
        </div>

        {active === "wallet" && !walletDone && (
          <div style={{ background:"var(--surface-raised)", border:"1px solid var(--border)",
                         borderRadius:16, padding:"1.5rem", marginBottom:"2rem" }}>
            <div style={{ fontFamily:S, fontSize:"1.1rem", fontWeight:700, marginBottom:"0.75rem" }}>
              Your account is one sign-in away
            </div>
            <p style={{ fontFamily:S, fontSize:"0.85rem", color:"var(--text-secondary)", lineHeight:1.7, margin:0 }}>
              No browser wallet extensions. No seed phrase to write down. Google sign-in creates your Abraxas account automatically.
            </p>
          </div>
        )}

        {activeStamp && (() => {
          const status = passportState[activeStamp.id as keyof PassportState];
          return (
            <div style={{ background:"var(--surface-raised)",
                           border:`1.5px solid ${activeStamp.color}40`,
                           borderRadius:16, padding:"1.5rem", marginBottom:"2rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                             alignItems:"flex-start", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
                <div>
                  <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                                 color:statusColor[status], marginBottom:"0.25rem" }}>
                    {statusLabel[status]}
                  </div>
                  <div style={{ fontFamily:S, fontSize:"1.25rem", fontWeight:700, color:"var(--text-primary)" }}>
                    {activeStamp.name}
                  </div>
                </div>
                <div style={{ fontFamily:S, fontSize:"0.68rem", color:"var(--text-muted)",
                               background:"var(--surface-raised)", padding:"0.375rem 0.75rem",
                               borderRadius:20, border:"1px solid var(--border)" }}>
                  ⏱ {activeStamp.timeEstimate}
                </div>
              </div>

              <p style={{ fontFamily:S, fontSize:"0.85rem", color:"var(--text-secondary)",
                           lineHeight:1.7, margin:"0 0 1.25rem" }}>
                {activeStamp.description}
              </p>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
                             gap:"1rem", marginBottom:"1.25rem" }}>
                <div style={{ background:"var(--surface)", borderRadius:10, padding:"1rem", border:"1px solid var(--border)" }}>
                  <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700, color:"var(--text-primary)", marginBottom:"0.5rem" }}>
                    What this proves
                  </div>
                  <p style={{ fontFamily:S, fontSize:"0.78rem", color:"var(--text-secondary)", lineHeight:1.65, margin:0 }}>
                    {activeStamp.whatItProves}
                  </p>
                </div>
                <div style={{ background:"var(--surface)", borderRadius:10, padding:"1rem", border:"1px solid var(--border)" }}>
                  <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700, color:"var(--text-primary)", marginBottom:"0.5rem" }}>
                    What you'll need
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem" }}>
                    {activeStamp.requiredDocs.map(d => (
                      <div key={d} style={{ display:"flex", gap:"0.375rem", alignItems:"flex-start" }}>
                        <span style={{ color:activeStamp.color, flexShrink:0, marginTop:2 }}>·</span>
                        <span style={{ fontFamily:S, fontSize:"0.72rem", color:"var(--text-secondary)", lineHeight:1.5 }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ background:"var(--surface)", borderRadius:10, padding:"1rem",
                             border:"1px solid var(--border)", marginBottom:"1rem" }}>
                <div style={{ fontFamily:S, fontSize:"0.7rem", fontWeight:700, color:"var(--text-primary)", marginBottom:"0.75rem" }}>
                  How it works, step by step
                </div>
                {activeStamp.processSteps.map((step, i) => (
                  <div key={step} style={{ display:"flex", gap:"0.75rem",
                                           paddingBottom: i < activeStamp.processSteps.length - 1 ? "0.625rem" : 0 }}>
                    <div style={{ width:22, height:22, borderRadius:"50%",
                                   background:`${activeStamp.color}15`, border:`1.5px solid ${activeStamp.color}40`,
                                   display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                                   fontFamily:M, fontSize:"0.6rem", fontWeight:700, color:activeStamp.color }}>
                      {i + 1}
                    </div>
                    <span style={{ fontFamily:S, fontSize:"0.78rem", color:"var(--text-secondary)", lineHeight:1.6, paddingTop:2 }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ fontFamily:S, fontSize:"0.7rem", color:"var(--text-muted)", lineHeight:1.6, marginBottom:"1.25rem" }}>
                <strong style={{ color:"var(--text-secondary)" }}>Regulatory basis:</strong>{" "}
                {activeStamp.regulatoryBasis}
              </div>

              {activeStamp.id === "identity" && status !== "earned" && (
                <div id="identity-stamp">
                  {!walletDone && (
                    <div style={{ fontFamily:S, fontSize:"0.78rem", color:A, marginBottom:"0.75rem" }}>
                      Sign in with Google above first. The ID check links to your account.
                    </div>
                  )}
                  <button onClick={startIdentityVerification} disabled={starting || !walletDone}
                    style={{ padding:"0.75rem 2rem", borderRadius:8, border:"none",
                              background: walletDone ? G : "var(--surface-raised)",
                              color: walletDone ? "#000" : "var(--text-muted)",
                              fontFamily:S, fontSize:"0.88rem", fontWeight:700,
                              cursor: walletDone ? "pointer" : "not-allowed",
                              opacity: starting ? 0.6 : 1 }}>
                    {starting ? "Starting..." : walletDone ? `${consumerCopy.passport.precheck} →` : "Sign in to continue"}
                  </button>
                  <div style={{ marginTop:"1.25rem", paddingTop:"1.25rem", borderTop:"1px solid var(--border)" }}>
                    <div style={{ fontFamily:S, fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:"0.75rem" }}>
                      ID check unavailable? Upload your ID directly for manual review.
                    </div>
                    <DocumentUpload email={email || suiAddress || ""} stampId="identity" color={activeStamp.color} />
                  </div>
                </div>
              )}
              {activeStamp.id !== "identity" && status !== "earned" && (
                <div>
                  {!walletDone && (
                    <div style={{ fontFamily:S, fontSize:"0.78rem", color:A, marginBottom:"0.75rem" }}>
                      Complete Google sign-in and Identity Verified first.
                    </div>
                  )}
                  <DocumentUpload email={email || suiAddress || ""} stampId={activeStamp.id} color={activeStamp.color} />
                  <Link href="mailto:verify@abraxas-app.vercel.app?subject=Passport%20Verification%20Request"
                    style={{ display:"inline-block", marginTop:"0.75rem", padding:"0.75rem 2rem",
                              borderRadius:8, border:`1.5px solid ${activeStamp.color}`,
                              background:"transparent", color:activeStamp.color,
                              fontFamily:S, fontSize:"0.88rem", fontWeight:700, textDecoration:"none" }}>
                    Already uploaded? Notify us for review →
                  </Link>
                </div>
              )}
              {status === "earned" && (
                <div style={{ padding:"0.75rem 1.5rem", borderRadius:8,
                               background:`${activeStamp.color}12`, border:`1.5px solid ${activeStamp.color}40`,
                               display:"inline-flex", alignItems:"center", gap:"0.5rem" }}>
                  <span style={{ color:activeStamp.color, fontSize:"1rem" }}>✓</span>
                  <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:600, color:activeStamp.color }}>
                    This credential is on your Passport.
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        <DeveloperDetails
          title="Technical details (for developers)"
          summary="zkLogin, W3C credentials, on-chain stamps, and Sui integration — expand if you're building on Abraxas."
        >
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"0.75rem", marginBottom:"1rem" }}>
            {[
              { title:"Wallet", body:"Google OAuth → zkLogin → deterministic Sui address. No seed phrase. Your Passport object lives at this address." },
              { title:"Issuance", body:"W3C Verifiable Credential v2.0, Ed25519 signed by Abraxas. Documents stay with the identity provider — only the verification outcome is credentialized." },
              { title:"On-chain anchor", body:"Stamp bitmask on Sui Move Passport object. Abraxas issues stamps after ID approval + manual review." },
              { title:"Portability", body:"Third parties verify via W3C credential or GET /api/sui/passport. Sponsored transactions for verified tiers (roadmap)." },
            ].map(c => (
              <div key={c.title} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"1rem" }}>
                <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:700, color:"var(--text-primary)", marginBottom:"0.375rem" }}>{c.title}</div>
                <p style={{ fontFamily:S, fontSize:"0.72rem", color:"var(--text-secondary)", lineHeight:1.65, margin:0 }}>{c.body}</p>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap", marginBottom:"1.25rem" }}>
            <Link href="/docs/sui" style={{ padding:"0.6rem 1.1rem", borderRadius:999, background:G, color:"#000",
                fontFamily:S, fontSize:"0.82rem", fontWeight:700, textDecoration:"none" }}>Sui integration hub →</Link>
            <Link href="/docs/passport-spec" style={{ padding:"0.6rem 1.1rem", borderRadius:999,
                border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-secondary)",
                fontFamily:S, fontSize:"0.82rem", fontWeight:600, textDecoration:"none" }}>Passport spec →</Link>
          </div>
          <SuiIntegrationsPanel showSetup />
          <div style={{ marginTop:"1.25rem" }}>
            <SuiDevnetPassportPanel
              compact
              ownerAddress={onChain?.provisioned ? suiAddress : undefined}
              objectId={onChain?.object_id ?? undefined}
            />
          </div>
        </DeveloperDetails>

        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap", paddingBottom:"3rem" }}>
          <Btn href="/">Explore assets →</Btn>
          <Btn href="/build" variant="tertiary">Submit an asset</Btn>
        </div>
      </div>
      <RedesignFooter />
    </div>
  );
}
