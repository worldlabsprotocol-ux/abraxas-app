// Stylized wallet pass icon — not Apple trademark artwork.

import type { CSSProperties } from "react";

type IconProps = {
  size?: number;
  color?: string;
  style?: CSSProperties;
};

export function WalletPassIcon({ size = 20, color = "currentColor", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <rect x="3" y="5" width="18" height="14" rx="3.5" stroke={color} strokeWidth="1.75" />
      <rect x="6.5" y="9" width="11" height="2.25" rx="1.125" fill={color} opacity="0.9" />
      <rect x="6.5" y="13" width="7.5" height="1.75" rx="0.875" fill={color} opacity="0.45" />
      <circle cx="17" cy="14" r="2.25" stroke={color} strokeWidth="1.25" fill="none" />
    </svg>
  );
}

export function ContactlessPayIcon({ size = 20, color = "currentColor", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <path
        d="M8.5 12.5c1.2-1.2 3.1-1.2 4.2 0"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6 10c2.4-2.4 6.3-2.4 8.7 0"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M3.5 7.5c3.6-3.6 9.4-3.6 13 0"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.5"
      />
      <rect x="10" y="14.5" width="4" height="5" rx="1" fill={color} opacity="0.85" />
    </svg>
  );
}

export function VerifiedCheckIcon({ size = 20, color = "currentColor", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.75" />
      <path
        d="M8.5 12.2 10.8 14.5 15.5 9.8"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
