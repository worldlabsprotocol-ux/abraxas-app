"use client";
// FILE: app/auth/callback/page.tsx
// Legacy Supabase magic-link callback — redirects to Sui zkLogin passport flow.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "error">("working");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function complete() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user?.email) {
          throw new Error(error?.message ?? "No session found in the link");
        }

        const email = data.session.user.email;
        localStorage.setItem("abraxas_email", email);

        router.push("/passport");
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      }
    }
    complete();
  }, [router]);

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
                   justifyContent:"center", background:"#060810",
                   color:"#fff", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:340, padding:"2rem" }}>
        {status === "working" ? (
          <>
            <div style={{ fontSize:"0.95rem", fontWeight:600, marginBottom:"0.5rem" }}>
              Confirming your email
            </div>
            <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.5)" }}>
              Redirecting to Passport — sign in with Google to create your Sui wallet…
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:"0.95rem", fontWeight:600, marginBottom:"0.5rem",
                           color:"#EF4444" }}>
              Couldn't complete sign in
            </div>
            <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.5)",
                           marginBottom:"1rem" }}>
              {errorMsg}
            </div>
            <a href="/passport" style={{ color:"#10B981", fontSize:"0.8rem",
                                                    textDecoration:"none" }}>
              Go to Passport →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
