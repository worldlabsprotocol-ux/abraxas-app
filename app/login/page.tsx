"use client";
export const dynamic = "force-dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Stub — redirects to main app. Reinstated when mint flow is stable.
export default function LoginPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return <div style={{minHeight:"100vh",background:"#060810"}}/>;
}