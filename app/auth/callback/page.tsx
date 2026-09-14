"use client";
// FILE: app/auth/callback/page.tsx
// Legacy Supabase magic-link callback. redirects to Sui zkLogin passport flow.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AuthStatusPanel } from "@/components/auth/AuthStatusPanel";

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

  if (status === "working") {
    return (
      <AuthStatusPanel
        status="loading"
        title="Confirming your email"
        description="Redirecting to Passport. Sign in with Google to create your Sui wallet."
      />
    );
  }

  return (
    <AuthStatusPanel
      status="error"
      title="Could not complete sign in"
      errorMessage={errorMsg}
    />
  );
}
