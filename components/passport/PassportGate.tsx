"use client";
// FILE: components/passport/PassportGate.tsx
// Sign-in gate for protected Passport actions. Public product exploration stays available.

import Link from "next/link";
import { useSuiAuth } from "@/components/sui/SuiAuthProvider";
import { HolderAccessPanel } from "@/components/sui/HolderAccessPanel";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function PassportGate({
  returnPath,
  title = "Sign in to unlock",
  description = "Full diligence packs, lot schedules, and survey PDFs stay inside Abraxas Passport. verify once, access anywhere.",
  children,
}: {
  returnPath: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useSuiAuth();

  if (isLoading) {
    return (
      <div style={{
        padding: "1.25rem", borderRadius: 12,
        border: "1px solid var(--border)", background: "var(--surface)",
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)",
      }}>
        Checking Passport session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        padding: "1.25rem 1.35rem", borderRadius: 14,
        border: `1px solid ${ACCENT}44`, background: `${ACCENT}08`,
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
          {title}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
          {description}
        </p>
        <HolderAccessPanel compact />
        <Link href="/proof" style={{
          display: "inline-block",
          marginTop: "0.75rem",
          padding: "0.62rem .9rem", borderRadius: 999,
          border: `1px solid ${ACCENT}55`, color: ACCENT,
          fontFamily: FONT, fontSize: ".72rem", fontWeight: 800,
          textDecoration: "none",
        }}>
          See how verification works
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
