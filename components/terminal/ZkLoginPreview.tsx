"use client";
// FILE: components/terminal/ZkLoginPreview.tsx
// Sui zkLogin sign-in. links to /passport for full verification flow.

import Link from "next/link";
import { S, G, W } from "./tokens";
import { ScrollFade } from "./ui";

export function ZkLoginPreview() {
  return (
    <ScrollFade>
      <div style={{ padding:"1.5rem", borderRadius:14,
                     background:"rgba(16,185,129,0.06)",
                     border:`1px solid ${G}30` }}>
        <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                       color:G, marginBottom:"0.5rem" }}>
          Sui zkLogin · live on Passport
        </div>
        <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.2vw,1.25rem)",
                       fontWeight:700, color:W, marginBottom:"0.75rem" }}>
          Sign in with Google. Sui address created automatically.
        </div>
        <p style={{ fontFamily:S, fontSize:"0.82rem",
                     color:"rgba(21,21,26,0.5)", lineHeight:1.7,
                     maxWidth:560, margin:"0 0 1.25rem" }}>
          No MetaMask. No seed phrases. Abraxas verification is Sui-native -
          zkLogin derives your on-chain Passport holder address from Google OAuth.
        </p>
        <Link href="/passport"
          style={{ display:"inline-flex", alignItems:"center", gap:"0.5rem",
                    padding:"0.625rem 1.25rem", borderRadius:8,
                    background:G, color:"#000", fontFamily:S,
                    fontSize:"0.82rem", fontWeight:700, textDecoration:"none" }}>
          Get verified on Passport →
        </Link>
        <div style={{ fontFamily:S, fontSize:"0.62rem",
                       color:"rgba(21,21,26,0.3)", letterSpacing:"0.04em",
                       marginTop:"0.875rem" }}>
          POWERED BY SUI ZKLOGIN
        </div>
      </div>
    </ScrollFade>
  );
}
