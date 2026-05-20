// FILE: app/auth/signin/page.tsx
// NextAuth custom sign-in page. All imports at top.
import { AuthOptions } from "@/components/AuthOptions";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { redirect }         from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session) redirect(searchParams.callbackUrl ?? "/");

  const MONO = "'JetBrains Mono',monospace";

  return (
    <div style={{
      minHeight:"100vh", background:"#060810",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:"1rem",
    }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
          <div style={{ fontWeight:900, fontSize:"1.4rem",
                        color:"#C8A96E", fontFamily:MONO,
                        letterSpacing:"0.1em", marginBottom:"0.25rem" }}>
            ABRAXAS
          </div>
          <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.2)",
                        fontFamily:MONO, textTransform:"uppercase",
                        letterSpacing:"0.25em" }}>
            Verification Protocol · Solana
          </div>
        </div>

        <AuthOptions callbackUrl={searchParams.callbackUrl ?? "/"} />

        <div style={{ marginTop:"1.5rem", fontSize:"0.42rem",
                      color:"rgba(255,255,255,0.15)", textAlign:"center",
                      fontFamily:MONO, lineHeight:1.8 }}>
          Wallet connection required for on-chain actions.
          Email / OAuth login provides read-only access
          until a wallet is linked.
        </div>
      </div>
    </div>
  );
}