// FILE: lib/design/monochromeSystem.ts
// Abraxas monochrome foundation — true black/white institutional palette.

export const MONO = {
  bgPrimary: "#050505",
  bgSecondary: "#101010",
  surfaceElevated: "#171717",
  textPrimary: "#F5F5F3",
  textSecondary: "#A3A3A3",
  borderSubtle: "#292929",
  divider: "#202020",
  /** Limited identity accent — not for default buttons */
  mineralGold: "#C4A962",
  /** Founder protocol imagery accent (nav, active states) */
  brandGreen: "#5EEAD4",
  actionPrimaryBg: "#F5F5F3",
  actionPrimaryText: "#050505",
} as const;

export const MONO_SEMANTIC = {
  verified: "#4CBB92",
  denied: "#E57373",
  pending: "#D4A574",
  failed: "#F87171",
  info: "#A3A3A3",
} as const;
