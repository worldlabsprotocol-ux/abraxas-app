"use client";
export const dynamic = "force-dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function LivePage() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return <div style={{ minHeight:"100vh", background:"#060810" }}/>;
}