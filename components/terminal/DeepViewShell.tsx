"use client";
// FILE: components/terminal/DeepViewShell.tsx
// Wrapper that renders the ← BACK button above any deep-view content.

import { M, BDR, CARD } from "./tokens";

interface DeepViewShellProps {
  children: React.ReactNode;
  onBack: () => void;
}

export function DeepViewShell({ children, onBack }: DeepViewShellProps) {
  return (
    <div style={{ background:"#FAFAF8", minHeight:"100vh" }}>
      <div style={{ padding:"0.75rem clamp(1rem,3vw,1.5rem)",
                     borderBottom:`1px solid ${BDR}`, background:CARD,
                     display:"flex", alignItems:"center", gap:"0.7rem" }}>
        <button
          onClick={onBack}
          style={{ padding:"0.3rem 0.75rem", borderRadius:4,
                    border:`1px solid ${BDR}`, background:"transparent",
                    color:"rgba(21,21,26,0.5)", fontFamily:M,
                    fontSize:"0.75rem", fontWeight:700, cursor:"pointer",
                    textTransform:"uppercase", letterSpacing:"0.08em" }}
        >
          {"\u2190"} BACK TO TERMINAL
        </button>
      </div>
      {children}
    </div>
  );
}
