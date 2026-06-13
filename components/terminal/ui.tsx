"use client";
// FILE: components/terminal/ui.tsx
// Shared micro-components: Label, Divider.

import { M, G, BDR } from "./tokens";

interface LabelProps { children: React.ReactNode }

export function Label({ children }: LabelProps) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                   marginBottom:"1.125rem" }}>
      <div style={{ width:3, height:15, background:G, borderRadius:2,
                     boxShadow:`0 0 6px ${G}60` }} />
      <span style={{ fontFamily:M, fontSize:"clamp(0.78rem,1.8vw,0.92rem)",
                      fontWeight:800, color:G, letterSpacing:"0.16em",
                      textTransform:"uppercase" }}>
        {children}
      </span>
    </div>
  );
}

export function Divider() {
  return (
    <div style={{ height:1, background:BDR, margin:"1.5rem 0" }} />
  );
}
