"use client";
// FILE: components/passport/AbraxasIdentityCapture.tsx
// Abraxas-native identity flow: legal name → ID photo → selfie → submit for review.

import { useMemo, useState, useEffect } from "react";
import { CameraCapture } from "@/components/passport/CameraCapture";
import { Btn } from "@/components/redesign/ui";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import {
  identityCaptureStepLabel,
  type IdentityCaptureStep,
} from "@/lib/idv/identityCapture";
import { runCapturePreflight } from "@/lib/idv/biometric/clientPreflight";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

interface AbraxasIdentityCaptureProps {
  email: string;
  suiAddress: string | null;
  onSubmitted?: () => void;
  pendingReview?: boolean;
}

interface CaptureState {
  blob: Blob;
  previewUrl: string;
}

export function AbraxasIdentityCapture({
  email: emailProp,
  suiAddress: suiProp,
  onSubmitted,
  pendingReview = false,
}: AbraxasIdentityCaptureProps) {
  const { suiAddress: authAddress, session, isLoading: authLoading, isAuthenticated } = useSuiAuth();
  const email = emailProp || session?.email || "";
  const suiAddress = suiProp ?? authAddress;
  const [step, setStep] = useState<IdentityCaptureStep>("name");
  const [legalName, setLegalName] = useState("");
  const [idCapture, setIdCapture] = useState<CaptureState | null>(null);
  const [selfieCapture, setSelfieCapture] = useState<CaptureState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(pendingReview);
  const [approvedInstant, setApprovedInstant] = useState(false);
  const [assuranceLevel, setAssuranceLevel] = useState<string | null>(null);

  useEffect(() => {
    if (pendingReview) setSubmitted(true);
  }, [pendingReview]);
  const [error, setError] = useState<string | null>(null);
  const [preflightWarning, setPreflightWarning] = useState<string | null>(null);
  const [checkingPreflight, setCheckingPreflight] = useState(false);

  const stepIndex = useMemo(
    () => ["name", "id_front", "selfie", "review"].indexOf(step),
    [step],
  );

  function canContinue(): boolean {
    if (step === "name") return legalName.trim().length >= 2;
    if (step === "id_front") return Boolean(idCapture);
    if (step === "selfie") return Boolean(selfieCapture);
    return true;
  }

  async function handleCapture(
    kind: "id_front" | "selfie",
    blob: Blob,
    previewUrl: string,
  ) {
    setCheckingPreflight(true);
    setPreflightWarning(null);
    setError(null);
    try {
      const result = await runCapturePreflight(blob, kind);
      if (!result.ok) {
        setPreflightWarning(result.issues[0] ?? "Retake this photo with better lighting and focus.");
        return;
      }
      if (kind === "id_front") {
        setIdCapture({ blob, previewUrl });
      } else {
        setSelfieCapture({ blob, previewUrl });
      }
    } catch {
      if (kind === "id_front") {
        setIdCapture({ blob, previewUrl });
      } else {
        setSelfieCapture({ blob, previewUrl });
      }
    } finally {
      setCheckingPreflight(false);
    }
  }

  function goNext() {
    if (step === "name") setStep("id_front");
    else if (step === "id_front") setStep("selfie");
    else if (step === "selfie") setStep("review");
  }

  function goBack() {
    if (step === "id_front") setStep("name");
    else if (step === "selfie") setStep("id_front");
    else if (step === "review") setStep("selfie");
  }

  async function submitCapture() {
    if (authLoading) {
      setError("Still loading your session. Please wait a moment.");
      return;
    }
    if (!isAuthenticated || !suiAddress) {
      setError("Your session expired. Refresh the page — you should still be signed in.");
      return;
    }
    if (!email.includes("@")) {
      setError("We need your Google email on file. Sign out, sign in once more, then submit again.");
      return;
    }
    if (!idCapture || !selfieCapture) {
      setError("Capture both your ID and selfie before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await fetch("/api/auth/browser-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sui_address: suiAddress }),
      });

      const formData = new FormData();
      formData.append("legal_name", legalName.trim());
      formData.append("id_front", idCapture.blob, "id_front.jpg");
      formData.append("selfie", selfieCapture.blob, "selfie.jpg");

      const res = await fetch("/api/identity/documents/capture", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json() as {
        submitted?: boolean;
        approved?: boolean;
        assurance_level?: string;
        capture_session_id?: string;
        error?: string;
        biometric?: { decision?: string };
      };

      if (res.status === 422) {
        throw new Error(data.error ?? "Photos did not pass Abraxas Verify checks. Please retake.");
      }

      if (!res.ok || !data.submitted) {
        throw new Error(data.error ?? "Submission failed");
      }

      setSubmitted(true);
      setApprovedInstant(data.approved === true);
      setAssuranceLevel(data.assurance_level ?? null);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div style={{ padding: "1rem", fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
        Loading your session…
      </div>
    );
  }

  if (submitted) {
    const instant = approvedInstant;
    return (
      <div style={{
        padding: "0.85rem 1rem",
        borderRadius: 12,
        background: instant ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.08)",
        border: `1px solid ${instant ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.25)"}`,
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: instant ? ACCENT : "#F59E0B", marginBottom: 6 }}>
          {instant ? `Verified · Assurance ${assuranceLevel ?? "L3"}` : "Submitted for Abraxas Verify review"}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          {instant
            ? "Abraxas Verify passed automated checks. Your Passport credential and on-chain stamps are active."
            : "Your photos are in the review queue. Partners receive the verification outcome only — not your document images."}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 14,
      border: "1px solid rgba(16,185,129,0.25)",
      background: "var(--surface-inset)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "0.85rem 1rem",
        borderBottom: "1px solid var(--border)",
        background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, transparent 100%)",
      }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.5rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: ACCENT, marginBottom: 4,
        }}>
          Abraxas Verify
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
          Verify with your device camera
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0.35rem 0 0.75rem", lineHeight: 1.55 }}>
          Name + government ID + selfie. Abraxas engine checks face match and liveness; our team reviews edge cases.
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          {(["name", "id_front", "selfie", "review"] as const).map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                background: i <= stepIndex ? ACCENT : "var(--border)",
              }}
              title={identityCaptureStepLabel(s)}
            />
          ))}
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginTop: 6 }}>
          Step {stepIndex + 1} of 4 · {identityCaptureStepLabel(step)}
        </div>
      </div>

      <div style={{ padding: "1rem" }}>
        {step === "name" && (
          <div>
            <label style={{ display: "block", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
              Legal name (as shown on your ID)
            </label>
            <input
              type="text"
              value={legalName}
              onChange={e => setLegalName(e.target.value)}
              placeholder="First Middle Last"
              autoComplete="name"
              style={{
                width: "100%",
                padding: "0.65rem 0.75rem",
                borderRadius: 8,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: "0.85rem",
              }}
            />
          </div>
        )}

        {step === "id_front" && (
          <CameraCapture
            label="Government ID — front"
            hint="Use your rear camera. Place your ID inside the frame with good lighting. Passport, driver's license, or national ID."
            facingMode="environment"
            color={ACCENT}
            capturedPreview={idCapture?.previewUrl ?? null}
            onCapture={(blob, previewUrl) => void handleCapture("id_front", blob, previewUrl)}
            onClear={() => { setIdCapture(null); setPreflightWarning(null); }}
          />
        )}

        {step === "selfie" && (
          <CameraCapture
            label="Selfie"
            hint="Use your front camera. Look straight at the camera. We'll compare this to your ID photo during review."
            facingMode="user"
            mirror
            color={ACCENT}
            capturedPreview={selfieCapture?.previewUrl ?? null}
            onCapture={(blob, previewUrl) => void handleCapture("selfie", blob, previewUrl)}
            onClear={() => { setSelfieCapture(null); setPreflightWarning(null); }}
          />
        )}

        {step === "review" && (
          <div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.75rem",
              marginBottom: "0.85rem",
            }}>
              {idCapture && (
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 4 }}>ID</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={idCapture.previewUrl} alt="ID preview" style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 120 }} />
                </div>
              )}
              {selfieCapture && (
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 4 }}>Selfie</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selfieCapture.previewUrl} alt="Selfie preview" style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 120, transform: "scaleX(-1)" }} />
                </div>
              )}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-primary)" }}>{legalName}</strong>
              <br />
              Submitted images are stored privately for Abraxas review only. Partners see verification outcome + credential — not your photos.
            </div>
          </div>
        )}

        {preflightWarning && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#F59E0B", margin: "0.75rem 0 0" }}>
            {preflightWarning}
          </p>
        )}

        {error && (
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: "0.75rem 0 0" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
          {step !== "name" && (
            <Btn variant="ghost" size="sm" onClick={goBack} disabled={submitting}>
              Back
            </Btn>
          )}
          {step !== "review" ? (
            <Btn size="sm" onClick={goNext} disabled={!canContinue() || checkingPreflight}>
              {checkingPreflight ? "Checking photo…" : "Continue →"}
            </Btn>
          ) : (
            <Btn size="sm" loading={submitting} onClick={() => void submitCapture()}>
              {submitting ? "Abraxas Verify is checking…" : "Submit for verification →"}
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
