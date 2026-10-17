"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContentCard } from "@/components/redesign/RedesignContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  ACCOUNT_USE_CASE_HEADING,
  ACCOUNT_USE_CASE_SUBHEAD,
  ACCOUNT_USE_CASES,
  type AccountUseCaseId,
} from "@/lib/account/accountHubCopy";
import { writeAccountUseCasePreference, readAccountUseCasePreference } from "@/lib/account/accountUseCasePreference";
import { useEffect, useState } from "react";

const FONT = ABRAXAS_FONT_SANS;

export function AccountUseCaseHub({ emphasizeIfUnset = true }: { emphasizeIfUnset?: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState<AccountUseCaseId | null>(null);

  useEffect(() => {
    setSaved(readAccountUseCasePreference());
  }, []);

  const showEmphasis = emphasizeIfUnset && !saved;

  function choose(id: AccountUseCaseId, href: string) {
    writeAccountUseCasePreference(id);
    setSaved(id);
    router.push(href);
  }

  return (
    <ContentCard title={ACCOUNT_USE_CASE_HEADING}>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
        {ACCOUNT_USE_CASE_SUBHEAD}
      </p>
      <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.75rem" }}>
        {ACCOUNT_USE_CASES.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "0.85rem 0.9rem",
              borderRadius: 12,
              border: showEmphasis ? "1px solid var(--border)" : "1px solid var(--border)",
              background: saved === item.id ? "var(--surface-inset)" : "var(--surface)",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {item.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", margin: "0.35rem 0 0.65rem", lineHeight: 1.55 }}>
              {item.summary}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => choose(item.id, item.href)}
                style={{
                  fontFamily: FONT,
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  padding: "0.45rem 0.85rem",
                  borderRadius: 999,
                  border: "none",
                  background: "#10B981",
                  color: "#04130C",
                  cursor: "pointer",
                }}
              >
                {item.primaryCta}
              </button>
              <Link
                href={item.href}
                style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)" }}
              >
                View details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}
