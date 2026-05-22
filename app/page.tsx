"use client";
// FILE: app/page.tsx
import dynamic from "next/dynamic";

// Dynamic import prevents SSR issues with Solana wallet adapter
const TerminalArena = dynamic(
  () => import("@/components/TerminalArena").then(m => ({ default: m.TerminalArena })),
  { ssr: false }
);

export default function Home() {
  return <TerminalArena />;
}
