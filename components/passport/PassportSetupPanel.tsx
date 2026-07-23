"use client";
// FILE: components/passport/PassportSetupPanel.tsx
// Dominant guided onboarding. account → identity → wallet bind.

import { ZkLoginSignIn } from "@/components/sui/ZkLoginSignIn";
import { truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import { signIntentMessage } from "@/lib/sui/intent/personalMessage";
import { getEphemeralSecretKey } from "@/lib/sui/zklogin/signingSession";
import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import type { IdentityStampStatus } from "@/lib/hooks/usePassportVerification";
import type { StoredCredential } from "@/lib/credentials/storage";
import { Btn } from "@/components/redesign/ui";
import { DocumentUpload } from "@/components/passport/DocumentUpload";
import { PassportTierCapabilities } from "@/components/passport/PassportTierCapabilities";
import Link from "next/link";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const UNLOCKS = [
  "Verified asset submissions",
  "Partner booking and payment flows",
  "Permissioned marketplace access",
  "Investor or entity eligibility, where required",
  "Faster future onboarding",
];

interface Props {
  walletDone: boolean;
  suiAddress: string | null;
  email: string;
  setup: PassportSetupState;
  identityStatus: IdentityStampStatus;
  credential: StoredCredential | null;
  isPolling: boolean;
  isRefreshing: boolean;
  starting: boolean;
  error: string | null;
  veriffConfigured: boolean;
  idvProvider?: "veriff" | "manual";
  onStartIdCheck: () => void;
  onRefresh: () => void;
  onWalletBound?: () => void;
  returnPath?: string | null;
}

export function PassportSetupPanel({
  walletDone,
  suiAddress,
  email,
  setup,
  identityStatus,
  credential,
  isPolling,
  isRefreshing,
  starting,
  error,
  veriffConfigured,
  idvProvider = veriffConfigured ? "veriff" : "manual",
  onStartIdCheck,
  onRefresh,
  onWalletBound,
  returnPath,
}: Props) {
  const manualMode = idvProvider === "manual";
  const assuranceLabel = manualMode ? "L2" : "L3";
  const completedCount = [setup.accountComplete, setup.walletBound, setup.identityComplete].filter(Boolean).length;

  async function bindWallet() {
    if (!suiAddress) return;
    try {
      const secret = getEphemeralSecretKey();
      if (!secret) throw new Error("Sign in again to enable wallet signing.");

      const chRes = await fetch("/api/wallet/binding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sui_address: suiAddress }),
      });
      const challenge = await chRes.json() as { challenge_id?: string; message?: string; error?: string };
      if (!chRes.ok || !challenge.challenge_id || !challenge.message) {
        throw new Error(challenge.error ?? "Challenge failed");
      }

      const { signature, publicKey } = await signIntentMessage(challenge.message, secret);
      const confirmRes = await fetch("/api/wallet/binding/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challenge.challenge_id,
          sui_address: suiAddress,
          message: challenge.message,
          signature,
          public_key: publicKey,
        }),
      });
      const result = await confirmRes.json() as { ok?: boolean; error?: string };
      if (!confirmRes.ok) throw new Error(result.error ?? "Confirm failed");
      onWalletBound?.();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <section aria-labelledby="passport-setup-heading" style={{ marginBottom: "2rem" }}>
      <div style={{
        borderRadius: 20,
        border: "2px solid rgba(16,185,129,0.35)",
        background: "var(--surface-raised)",
        overflow: "hidden",
        boxShadow: "0 0 48px rgba(16,185,129,0.08)",
      }}>
        <div style={{
          padding: "1.15rem 1.35rem",
          background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, transparent 100%)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.35rem",
          }}>
            Your Passport setup
          </div>
          <h2 id="passport-setup-heading" style={{
            fontFamily: FONT, fontSize: "clamp(1.15rem, 2.8vw, 1.45rem)", fontWeight: 800,
            letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 0.45rem",
          }}>
            {setup.nextAction === "ready"
              ? setup.identityComplete
                ? "Your Abraxas Passport is ready"
                : "Your profile is ready"
              : "Complete your profile once"}
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)",
            lineHeight: 1.6, margin: "0 0 0.75rem", maxWidth: 520,
          }}>
            Your reusable eligibility profile. Bind your wallet to finish setup , 
            ID verification is optional until a partner policy requires it.
          </p>
          <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
            Setup progress: {completedCount} of 3 complete · {setup.stepLabel}
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.35rem" }}>
          {/* Progress checklist */}
          <ol style={{ listStyle: "none", margin: "0 0 1.25rem", padding: 0, display: "grid", gap: "0.45rem" }}>
            {[
              { done: setup.accountComplete, label: "Account created", sub: walletDone && suiAddress ? truncateSuiAddress(suiAddress, 8, 6) : "Sign in with Google" },
              { done: setup.walletBound, label: "Bind wallet", sub: setup.walletBound ? "Signed control proof on file" : "One signature. no funds move" },
              { done: setup.identityComplete, label: "Verify identity", sub: setup.identityComplete ? `Credential active · ${assuranceLabel}` : "Optional · for payments & enhanced trust" },
            ].map(item => (
              <li key={item.label} style={{
                display: "flex", gap: "0.65rem", alignItems: "flex-start",
                padding: "0.55rem 0.65rem", borderRadius: 10,
                background: item.done ? "rgba(16,185,129,0.08)" : "var(--surface-inset)",
                border: `1px solid ${item.done ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: item.done ? ACCENT : "transparent",
                  border: `1.5px solid ${item.done ? ACCENT : "var(--border)"}`,
                  fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800,
                  color: item.done ? "#04130C" : "var(--text-muted)",
                }}>
                  {item.done ? "✓" : "○"}
                </span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                    {item.sub}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* Primary action for current step */}
          {!walletDone && (
            <div>
              <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: "0 0 0.85rem", lineHeight: 1.6 }}>
                No seed phrase. Google sign-in creates your Abraxas account and Sui wallet automatically.
              </p>
              <ZkLoginSignIn />
            </div>
          )}

          {walletDone && !setup.walletBound && (
            <div style={{
              padding: "0.85rem 1rem", borderRadius: 12,
              background: "var(--surface-inset)", border: "1px solid var(--border-strong)",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                Bind this wallet to your Passport
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.85rem" }}>
                Signing proves you control this wallet. It does not authorize a transaction or move funds.
                This completes your core profile. no ID upload required.
              </p>
              <Btn size="lg" fullWidth onClick={() => void bindWallet()}>
                Sign to bind wallet →
              </Btn>
            </div>
          )}

          {walletDone && setup.walletBound && !setup.identityComplete && (
            <div>
              <div style={{
                padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "0.85rem",
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
              }}>
                <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: ACCENT, marginBottom: "0.35rem" }}>
                  Continue with basic Passport
                </div>
                <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
                  Tier 1 complete. wallet bound. Browse, connect apps, and use the Cielo verified-rate pilot without ID verification.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {returnPath ? (
                    <Btn href={decodeURIComponent(returnPath)} size="sm">Return to flow →</Btn>
                  ) : (
                    <Btn href="/cielo/verified-rate" size="sm">Try Cielo verified rate →</Btn>
                  )}
                  <Btn href="/verify" variant="ghost" size="sm">Verify records</Btn>
                </div>
              </div>

              <div style={{
                padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "0.85rem",
                background: "var(--surface-inset)", border: "1px solid var(--border-strong)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                  <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Identity verification
                  </div>
                  <span style={{
                    fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700,
                    padding: "0.2rem 0.45rem", borderRadius: 999,
                    background: "rgba(16,185,129,0.12)", color: ACCENT,
                    border: "1px solid rgba(16,185,129,0.35)",
                  }}>
                    OPTIONAL
                  </span>
                </div>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
                  Your profile is active. Add an ID check when you need enhanced trust for payments, submissions, or partner policies.
                  {manualMode ? (
                    <> Upload a government ID below. our team reviews manually (Veriff trial is not active).</>
                  ) : (
                    <> Usually takes 2-4 minutes via licensed provider. Abraxas stores outcome only.</>
                  )}
                </p>

                {manualMode && (identityStatus === "pending" || isPolling) && (
                  <div style={{
                    padding: "0.65rem 0.75rem", borderRadius: 10, marginBottom: "0.65rem",
                    background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)",
                  }}>
                    <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#3B82F6", marginBottom: 4 }}>
                      Veriff session inactive
                    </div>
                    <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
                      If you started Veriff before the trial ended, that review will not complete. Upload your ID below for pilot manual review instead. or skip identity; Tier 1 Passport works without it.
                    </p>
                  </div>
                )}

                {(identityStatus === "pending" || isPolling) ? (
                  <div style={{
                    padding: "0.65rem 0.75rem", borderRadius: 10,
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                    marginBottom: "0.65rem",
                  }}>
                    <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#F59E0B", marginBottom: 4 }}>
                      {manualMode ? "Review in progress" : "Verification in progress"}
                    </div>
                    <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
                      {manualMode
                        ? "Our team is reviewing your uploaded ID. You can continue using your profile while you wait."
                        : "Veriff is reviewing your submission. Your profile stays active."}
                    </p>
                    <Btn variant="secondary" size="sm" loading={isRefreshing} onClick={onRefresh}>
                      Check status now
                    </Btn>
                  </div>
                ) : identityStatus === "declined" ? (
                  <div style={{
                    padding: "0.65rem 0.75rem", borderRadius: 10,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                    marginBottom: "0.65rem",
                  }}>
                    <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "#EF4444", marginBottom: 4 }}>
                      Verification not approved
                    </div>
                    <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
                      Try again with a different document, or contact support.
                    </p>
                  </div>
                ) : null}

                {manualMode ? (
                  <>
                    <DocumentUpload
                      email={email}
                      suiAddress={suiAddress}
                      stampId="identity"
                      color={ACCENT}
                      onUploaded={onRefresh}
                    />
                    <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0.65rem 0 0", lineHeight: 1.5 }}>
                      Pilot · Manual review · Assurance L2. Not required to use your profile.
                    </p>
                  </>
                ) : !veriffConfigured ? (
                  <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#F59E0B", margin: "0 0 0.65rem" }}>
                    Automated ID check is not configured. Use manual upload for pilot access.
                  </p>
                ) : (
                  <>
                    <Btn
                      size="lg"
                      fullWidth
                      loading={starting}
                      onClick={onStartIdCheck}
                      disabled={identityStatus === "pending"}
                    >
                      Add identity verification. optional →
                    </Btn>
                    <Btn
                      variant="ghost"
                      size="sm"
                      fullWidth
                      href={returnPath ? decodeURIComponent(returnPath) : "/cielo/verified-rate"}
                    >
                      Skip for now →
                    </Btn>
                  </>
                )}

                {error && (
                  <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: "0.65rem 0 0" }}>{error}</p>
                )}
              </div>

              <PassportVerificationFallback
                email={email || suiAddress || ""}
                suiAddress={suiAddress}
                manualMode={manualMode}
                onRetry={onStartIdCheck}
                onRefresh={onRefresh}
                starting={starting}
              />
            </div>
          )}

          {setup.nextAction === "ready" && setup.profileComplete && !setup.identityComplete && (
            <div style={{
              padding: "0.85rem 1rem", borderRadius: 12, marginBottom: "0.85rem",
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: ACCENT, marginBottom: "0.5rem" }}>
                ✓ Profile ready. browse, verify, and connect
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Wallet bound · Core account active · Add optional ID check above when a deal requires enhanced trust.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
                <Btn href="/verify?mode=profile" size="sm">Set up public profile →</Btn>
                <Btn href="/verify" variant="secondary" size="sm">Test verification</Btn>
                <Btn href="/verify" variant="ghost" size="sm">Verify records</Btn>
              </div>
            </div>
          )}

          {setup.nextAction === "ready" && setup.identityComplete && credential && (
            <div style={{
              padding: "0.85rem 1rem", borderRadius: 12,
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
            }}>
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: ACCENT, marginBottom: "0.5rem" }}>
                ✓ Passport ready for supported verified actions
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                Identity credential active · {manualMode ? "Abraxas manual review" : "Veriff / Abraxas"} · Assurance {assuranceLabel}
                {credential.expires_at && <> · Expires {new Date(credential.expires_at).toLocaleDateString()}</>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
                <Btn href="/verify?mode=credential" size="sm">Verify credential publicly →</Btn>
                <Btn href="/verify?mode=policy" variant="secondary" size="sm">Run policy check</Btn>
                <Btn href="/build" variant="secondary" size="sm">Submit an asset</Btn>
                <Btn href="/verify" variant="ghost" size="sm">Verify records</Btn>
              </div>
            </div>
          )}

          {/* What this unlocks */}
          {!setup.identityComplete && (
            <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
              <div style={{
                fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "var(--text-muted)", marginBottom: "0.5rem",
              }}>
                What this unlocks
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {UNLOCKS.map(u => (
                  <li key={u} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 4 }}>
                    {u}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PassportTierCapabilities
            input={{
              accountActive: setup.accountComplete,
              profileComplete: setup.profileComplete,
              walletBound: setup.walletBound,
              walletBindingFresh: setup.walletBound,
              identityCredentialActive: setup.identityComplete,
            }}
          />

          <PassportDataTransparency visible={setup.identityComplete} via={manualMode ? "manual" : "veriff"} />
        </div>
      </div>
    </section>
  );
}

function PassportVerificationFallback({
  email,
  suiAddress,
  manualMode,
  onRetry,
  onRefresh,
  starting,
}: {
  email: string;
  suiAddress: string | null;
  manualMode: boolean;
  onRetry: () => void;
  onRefresh: () => void;
  starting: boolean;
}) {
  if (manualMode) return null;

  return (
    <details style={{ marginTop: "0.85rem" }}>
      <summary style={{
        fontFamily: FONT, fontSize: "0.74rem", fontWeight: 600,
        color: "var(--text-muted)", cursor: "pointer", listStyle: "none",
      }}>
        Having trouble verifying?
      </summary>
      <div style={{
        marginTop: "0.65rem", padding: "0.75rem", borderRadius: 10,
        background: "var(--surface-inset)", border: "1px solid var(--border)",
        display: "flex", flexDirection: "column", gap: "0.5rem",
      }}>
        <Btn variant="secondary" size="sm" loading={starting} onClick={onRetry}>Try again</Btn>
        <DocumentUpload email={email} suiAddress={suiAddress} stampId="identity" color={ACCENT} onUploaded={onRefresh} />
        <Link
          href="mailto:verify@abraxas-app.vercel.app?subject=Passport%20manual%20review"
          style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT, textDecoration: "none" }}
        >
          Contact Passport Support →
        </Link>
        <p style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
          Manual review is logged and restricted to pilot users. Status: review requested after upload.
        </p>
      </div>
    </details>
  );
}

function PassportDataTransparency({ visible, via }: { visible: boolean; via: string }) {
  if (!visible) return null;
  return (
    <div style={{ marginTop: "1rem", padding: "0.65rem 0.75rem", borderRadius: 10, background: "var(--surface-inset)", border: "1px solid var(--border)" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.48rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        What Abraxas stores
      </div>
      {[
        ["Identity", "Verified outcome only"],
        ["Document images", "Not stored by Abraxas"],
        ["Biometric data", "Not stored by Abraxas"],
        ["Verification provider", via === "veriff" ? "Veriff" : via === "manual" ? "Abraxas pilot review" : "Licensed provider"],
      ].map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontFamily: FONT, fontSize: "0.68rem", marginBottom: 3 }}>
          <span style={{ color: "var(--text-muted)" }}>{k}</span>
          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
