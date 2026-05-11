// FILE: app/page.tsx
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { SystemStatusBar } from "@/components/SystemStatusBar";

const TerminalArena = dynamic(
  () => import("@/components/TerminalArena").then(m => ({ default: m.TerminalArena })),
  { ssr: false }
);

function Loading() {
  return (
    <div style={{
      minHeight:"100vh",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      background:"rgba(2,3,10,0.99)",
      flexDirection:"column",
      gap:"0.75rem",
    }}>
      <div style={{ width:"32px",height:"32px",borderRadius:"50%",border:"2px solid rgba(200,169,110,0.2)",borderTopColor:"#C8A96E",animation:"spin 0.8s linear infinite" }} />
      <span style={{ fontSize:"0.52rem",color:"rgba(200,169,110,0.5)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.18em",textTransform:"uppercase" }}>
        Abraxas Protocol · Loading
      </span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function Home() {
  return (
    <div style={{ minHeight:"100vh", paddingBottom:"72px" }}>
      <SystemStatusBar />
      <Suspense fallback={<Loading />}>
        <TerminalArena />
      </Suspense>
    </div>
  );
}