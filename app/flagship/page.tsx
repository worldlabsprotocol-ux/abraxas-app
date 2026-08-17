"use client";
// FILE: app/flagship/page.tsx
// Cielo Sunrise genesis asset dossier. institutional redesign shell.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { FlagshipAssetPage } from "@/components/assets/FlagshipAssetPage";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function FlagshipPage() {
  return (
    <RedesignPage maxWidth={900}>
      <Link href="/" style={{
        display: "inline-block",
        fontFamily: FONT,
        fontSize: "0.8rem",
        fontWeight: 600,
        color: "var(--text-muted)",
        textDecoration: "none",
        marginBottom: "1rem",
      }}>
        ← Back to home
      </Link>
      <FlagshipAssetPage />
    </RedesignPage>
  );
}
