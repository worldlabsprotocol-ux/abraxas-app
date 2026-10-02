"use client";
// FILE: components/partner/VerifyWithAbraxas.tsx
// Optional browser launcher — server must create verification_url; never holds partner secrets.

import { useCallback, useState } from "react";
import { Btn } from "@/components/redesign/ui";

export type VerifyWithAbraxasState =
  | "default"
  | "loading"
  | "redirecting"
  | "error"
  | "disabled";

export interface VerifyWithAbraxasProps {
  /** Server-built Hosted Partner Flow URL from AbraxasPartnerKit.createVerificationRequest. */
  verificationUrl: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark" | "neutral";
  state?: VerifyWithAbraxasState;
  errorMessage?: string | null;
  onLaunch?: () => void;
  className?: string;
}

const THEME_STYLES: Record<NonNullable<VerifyWithAbraxasProps["theme"]>, Record<string, string>> = {
  light: { background: "#fff", color: "#111", border: "1px solid #ccc" },
  dark: { background: "#111", color: "#fff", border: "1px solid #333" },
  neutral: { background: "transparent", color: "inherit", border: "1px solid currentColor" },
};

export function VerifyWithAbraxas({
  verificationUrl,
  label = "Verify with Abraxas",
  size = "md",
  theme = "neutral",
  state: controlledState,
  errorMessage,
  onLaunch,
  className,
}: VerifyWithAbraxasProps) {
  const [internalState, setInternalState] = useState<VerifyWithAbraxasState>("default");
  const state = controlledState ?? internalState;
  const disabled = state === "disabled" || state === "redirecting";
  const displayLabel = state === "loading"
    ? "Preparing…"
    : state === "redirecting"
      ? "Redirecting…"
      : label;

  const launch = useCallback(() => {
    if (disabled || !verificationUrl) return;
    setInternalState("redirecting");
    onLaunch?.();
    window.location.assign(verificationUrl);
  }, [disabled, onLaunch, verificationUrl]);

  return (
    <div className={className}>
      <Btn
        type="button"
        size={size}
        disabled={disabled || !verificationUrl}
        onClick={launch}
        style={THEME_STYLES[theme]}
        aria-busy={state === "loading" || state === "redirecting"}
      >
        {displayLabel}
      </Btn>
      {state === "error" && errorMessage ? (
        <p role="alert" style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#b00020" }}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
