"use client";
// FILE: components/passport/AbraxasIdentityCapture.tsx
// Abraxas-native identity flow: legal name → ID photo → selfie → submit for review.

import { useMemo, useState } from "react";
import { CameraCapture } from "@/components/passport/CameraCapture";
import { Btn } from "@/components/redesign/ui";
import {
  identityCaptureStepLabel,
  type IdentityCaptureStep,
} from "@/lib/idv/identityCapture";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

interface AbraxasIdentityCaptureProps {
  email: string;
  suiAddress: string | null;
  onSubmitted?: () => void;
}

interface CaptureState {
  blob: Blob;
  previewUrl: string;
}

export function AbraxasIdentityCapture({
  email,
  suiAddress,
  onSubmitted,
}: AbraxasIdentityCaptureProps) {
  const [step, setStep] = useState<IdentityCaptureStep>("name");
  const [legalName, setLegalName] = useState("");
  const [idCapture, setIdCapture] = useState<CaptureState | null>(null);
  const [selfieCapture, setSelfieCapture] = useState<CaptureState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!email.includes("@")) {
      setError("Sign in with Google so we can link this verification to your account.");
      return;
    }
    if (!suiAddress) {
      setError("Sign in with Google (top right) before submitting identity verification.");
      return;
    }
    if (!idCapture || !selfieCapture) {
      setError("Capture both your ID and selfie before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
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
        capture_session_id?: string;
        error?: string;
      };

      if (!res.ok || !data.submitted) {
        throw new Error(data.error ?? "Submission failed");
      }

      setSubmitted(true);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{
        padding: "0.85rem 1rem",
        borderRadius: 12,
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.25)",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "#F59E0B", marginBottom: 6 }}>
          Submitted for Abraxas review
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          Your name, ID photo, and selfie are queued for pilot review. Partners receive the verification outcome only — not your document images. This page updates when approved.
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
          Abraxas verify · Pilot L2
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
          Verify with your device camera
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0.35rem 0 0.75rem", lineHeight: 1.55 }}>
          Name + government ID + selfie. Reviewed by Abraxas. On approval, your Passport credential and on-chain stamps are issued.
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
            onCapture={(blob, previewUrl) => setIdCapture({ blob, previewUrl })}
            onClear={() => setIdCapture(null)}
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
            onCapture={(blob, previewUrl) => setSelfieCapture({ blob, previewUrl })}
            onClear={() => setSelfieCapture(null)}
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
            <Btn size="sm" onClick={goNext} disabled={!canContinue()}>
              Continue →
            </Btn>
          ) : (
            <Btn size="sm" loading={submitting} onClick={() => void submitCapture()}>
              Submit for review →
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
