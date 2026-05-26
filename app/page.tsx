// FILE: app/page.tsx
// Auth gate: unauthenticated users see the terminal but with a persistent
// sign-in overlay. Once authenticated (wallet OR session) the overlay dismisses.
"use client";

import { useEffect, useState }  from "react";
import { useSession }            from "next-auth/react";
import { useWallet }             from "@solana/wallet-adapter-react";
import { TerminalLayout }        from "@/components/terminal/TerminalLayout";
import { AuthGate }              from "@/components/AuthGate";

export default function Home() {
  const { data: session, status } = useSession();
  const { connected }             = useWallet();
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Show nothing during SSR / hydration
  if (!mounted || status === "loading") {
    return (
      <div style={{ height:"100vh", background:"#0C0E12",
                     display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace",
                        fontSize:"0.44rem", color:"rgba(255,255,255,0.2)",
                        textTransform:"uppercase", letterSpacing:"0.15em",
                        animation:"pulse 1.5s ease-in-out infinite" }}>
          INITIALIZING TERMINAL…
        </span>
        <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}`}</style>
      </div>
    );
  }

  const isAuthed = !!session || connected;

  return (
    <>
      <TerminalLayout />
      {!isAuthed && <AuthGate />}
    </>
  );
}
