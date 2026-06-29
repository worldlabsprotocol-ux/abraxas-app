"use client";
// FILE: components/identity/PassportStampIcon.tsx
// Modern stroke icons for passport credential stamps.

import type { ReactNode } from "react";

export type PassportStampKind =
  | "identity"
  | "biometric"
  | "business"
  | "investor"
  | "accredited"
  | "owner"
  | "asset_owner"
  | "royalty"
  | "property"
  | "tribal"
  | "compliance"
  | "lending"
  | "social";

interface PassportStampIconProps {
  kind: PassportStampKind;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const PATHS: Record<PassportStampKind, ReactNode> = {
  identity: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="12" cy="11" r="2.5" />
      <path d="M8 17c.8-2 2.2-3 4-3s3.2 1 4 3" />
    </>
  ),
  biometric: (
    <>
      <path d="M12 3a9 9 0 0 1 9 9" />
      <path d="M12 7a5 5 0 0 1 5 5" />
      <path d="M12 11a1 1 0 0 1 1 1" />
      <path d="M7 12c0 2.8 2.2 5 5 5s5-2.2 5-5" />
      <path d="M5 12a7 7 0 0 1 14 0" />
    </>
  ),
  business: (
    <>
      <path d="M4 20V8l8-4 8 4v12" />
      <path d="M9 20v-6h6v6" />
      <path d="M9 10h6" />
    </>
  ),
  investor: (
    <>
      <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8L12 3z" />
    </>
  ),
  accredited: (
    <>
      <path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8L12 3z" />
      <path d="M9.5 12.2l1.8 1.8 3.5-3.6" />
    </>
  ),
  owner: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M11 11l8.5 8.5" />
      <path d="M16 16l2 2" />
      <path d="M18.5 13.5l2 2" />
    </>
  ),
  asset_owner: (
    <>
      <path d="M12 3l7 4v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V7l7-4z" />
      <path d="M9.5 12.2l1.8 1.8 3.5-3.6" />
    </>
  ),
  royalty: (
    <>
      <path d="M9 18V7l3 2 3-2v11" />
      <path d="M6 18h12" />
      <circle cx="12" cy="5.5" r="1" />
    </>
  ),
  property: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20H4z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  tribal: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <path d="M12 4a12 12 0 0 1 0 16" />
      <path d="M12 4a12 12 0 0 0 0 16" />
    </>
  ),
  compliance: (
    <>
      <path d="M12 3l7 4v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V7l7-4z" />
      <path d="M9.5 12.2l1.8 1.8 3.5-3.6" />
    </>
  ),
  lending: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8" />
      <path d="M9.5 10.5 12 8l2.5 2.5" />
      <path d="M9.5 13.5 12 16l2.5-2.5" />
    </>
  ),
  social: (
    <>
      <circle cx="12" cy="8" r="3" />
      <circle cx="6.5" cy="16" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
      <path d="M10 10.5 7.5 14" />
      <path d="M14 10.5l2.5 3.5" />
    </>
  ),
};

export function PassportStampIcon({
  kind,
  size = 22,
  color = "currentColor",
  strokeWidth = 1.75,
}: PassportStampIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {PATHS[kind]}
    </svg>
  );
}
