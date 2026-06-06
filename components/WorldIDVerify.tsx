// FILE: components/WorldIDVerify.tsx
// World ID stub — renders nothing until v2 SDK integration is configured.
// Replace this file with the full implementation when ready.
// See: docs.world.org/world-id/quick-start for v2 setup guide.
"use client";

export function WorldIDVerify({
  mode = "button",
  onVerified,
  onError,
  signal,
}: {
  mode?:       "button" | "compact";
  onVerified?: (nullifierHash: string) => void;
  onError?:    (msg: string) => void;
  signal?:     string;
}) {
  // Returns null until @worldcoin/idkit v2 + RP signing key are configured.
  // The modal and terminal page import this but it renders nothing safely.
  return null;
}