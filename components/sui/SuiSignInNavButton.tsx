"use client";
// FILE: components/sui/SuiSignInNavButton.tsx
// Nav CTA — Sui zkLogin instead of Solana wallet on redesign surfaces.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { loadUserSession } from "@/lib/sui/zklogin/session";
import { truncateSuiAddress } from "@/lib/sui/identity";
import { useEffect, useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function SuiSignInNavButton() {
  const pathname = usePathname();
  const [addr, setAddr] = useState<string | null>(null);

  useEffect(() => {
    setAddr(loadUserSession()?.suiAddress ?? null);
  }, [pathname]);

  if (addr) {
    return (
      <Link href="/passport" style={{
        padding: "0.45rem 0.85rem", borderRadius: 999,
        border: `1px solid ${ACCENT}44`, background: `${ACCENT}12`,
        fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem",
        color: ACCENT, textDecoration: "none", fontWeight: 600,
      }}>
        {truncateSuiAddress(addr, 4, 4)}
      </Link>
    );
  }

  return (
    <Link href="/passport" style={{
      padding: "0.45rem 0.95rem", borderRadius: 999,
      border: "1px solid var(--border)", background: "var(--surface)",
      fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600,
      color: "var(--text-secondary)", textDecoration: "none",
    }}>
      Sign in
    </Link>
  );
}
