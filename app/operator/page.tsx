"use client";
export const dynamic = "force-dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function P() {
  const r = useRouter();
  useEffect(() => { r.replace("/"); }, [r]);
  return null;
}
