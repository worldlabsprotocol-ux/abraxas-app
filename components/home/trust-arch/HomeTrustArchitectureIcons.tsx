"use client";
// FILE: components/home/trust-arch/HomeTrustArchitectureIcons.tsx

import type { ProtocolFlowStageId } from "@/lib/home/homepageTrustArchitectureCopy";

const STROKE = "currentColor";

export function ProtocolStageIcon({ stage }: { stage: ProtocolFlowStageId }) {
  switch (stage) {
    case "application":
      return (
        <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden focusable="false">
          <rect x="10" y="8" width="28" height="32" rx="3" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <path d="M16 16h16M16 22h16M16 28h10" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "holder_authorization":
      return (
        <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden focusable="false">
          <circle cx="24" cy="16" r="6" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <path d="M12 38c0-6.6 5.4-12 12-12s12 5.4 12 12" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <circle cx="34" cy="34" r="7" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <path d="M31 34l2 2 4-4" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "issuer_evidence":
      return (
        <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden focusable="false">
          <ellipse cx="24" cy="28" rx="14" ry="6" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <path d="M10 28v-6c0-3.3 6.3-6 14-6s14 2.7 14 6v6" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <rect x="28" y="10" width="12" height="14" rx="2" fill="none" stroke={STROKE} strokeWidth="1.5" />
        </svg>
      );
    case "policy_evaluation":
      return (
        <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden focusable="false">
          <rect x="10" y="10" width="22" height="28" rx="2" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <circle cx="34" cy="34" r="8" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <path d="M34 30v4l3 2" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "signed_decision":
      return (
        <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden focusable="false">
          <path d="M24 6l14 4v14c0 9-6 16-14 18-8-2-14-9-14-18V10l14-4z" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <path d="M18 24l4 4 8-8" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "independent_verification":
      return (
        <svg viewBox="0 0 48 48" width={40} height={40} aria-hidden focusable="false">
          <rect x="8" y="20" width="10" height="10" rx="2" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <rect x="30" y="12" width="10" height="10" rx="2" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <rect x="30" y="28" width="10" height="10" rx="2" fill="none" stroke={STROKE} strokeWidth="1.5" />
          <path d="M18 25h6M30 17l-4 6M30 33l-4-4" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function DefensiblePanelIcon({ id }: { id: "wallet_native" | "evidence_based" | "independent_verify" }) {
  if (id === "wallet_native") {
    return (
      <svg viewBox="0 0 48 48" width={44} height={44} aria-hidden focusable="false">
        <rect x="8" y="14" width="32" height="22" rx="4" fill="none" stroke={STROKE} strokeWidth="1.5" />
        <path d="M8 22h32" stroke={STROKE} strokeWidth="1.5" />
        <circle cx="32" cy="28" r="2" fill={STROKE} />
      </svg>
    );
  }
  if (id === "evidence_based") {
    return (
      <svg viewBox="0 0 48 48" width={44} height={44} aria-hidden focusable="false">
        <rect x="12" y="10" width="24" height="30" rx="2" fill="none" stroke={STROKE} strokeWidth="1.5" />
        <path d="M18 18h12M18 24h12M18 30h8" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M30 32l4 4 6-8" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" width={44} height={44} aria-hidden focusable="false">
      <path d="M24 8l13 4v12c0 8-5.5 14.5-13 16.5C16.5 38.5 11 32 11 24V12l13-4z" fill="none" stroke={STROKE} strokeWidth="1.5" />
      <path d="M18 24l4 4 8-9" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
