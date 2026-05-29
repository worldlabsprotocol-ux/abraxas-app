"use client";
// FILE: components/TerminalArena.tsx
// DEPRECATED — replaced by app/terminal/page.tsx
// Stub to prevent import errors. Route to terminal instead.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function TerminalArena() {
  const r = useRouter();
  useEffect(() => { r.replace("/terminal"); }, [r]);
  return null;
}
