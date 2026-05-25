// FILE: app/page.tsx
// SolanaProvider now in layout.tsx — no dynamic import needed here.
import { TerminalArena } from "@/components/TerminalArena";

export default function Home() {
  return <TerminalArena />;
}
