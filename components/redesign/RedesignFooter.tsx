"use client";
// FILE: components/redesign/RedesignFooter.tsx

import Link from "next/link";
import {
  FOOTER_COMPANY_LINKS,
  FOOTER_LEGAL_LINKS,
  FOOTER_PRIMARY_LINKS,
} from "@/lib/design/footerLinks";
import { PUBLIC_FONT_SANS } from "@/lib/design/publicSurface";
import { ABRAXAS_FONT_DISPLAY } from "@/lib/abraxasTypography";

const FONT = PUBLIC_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;

export function RedesignFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        position: "relative",
        zIndex: 1,
        marginTop: "var(--section-gap, 3rem)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "2rem clamp(1rem, 3vw, 2rem) 2.5rem",
        }}
      >
        <div style={{ marginBottom: "1.25rem" }}>
          <p
            style={{
              fontFamily: DISPLAY,
              fontSize: "1.05rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              margin: "0 0 0.35rem",
            }}
          >
            ABRAXAS
          </p>
          <p
            style={{
              fontFamily: FONT,
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            Trust is continuous.
          </p>
        </div>

        <nav
          aria-label="Footer"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem 1.75rem",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          {FOOTER_PRIMARY_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontFamily: FONT,
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              {item.label}
            </Link>
          ))}
          {FOOTER_COMPANY_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              rel="noopener noreferrer"
              target="_blank"
              style={{
                fontFamily: FONT,
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              {item.label}
            </a>
          ))}
          {FOOTER_LEGAL_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontFamily: FONT,
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div
          style={{
            paddingTop: "1rem",
            borderTop: "1px solid var(--border)",
            fontFamily: FONT,
            fontSize: "0.68rem",
            color: "var(--text-muted)",
          }}
        >
          © {new Date().getFullYear()} Abraxas
        </div>
      </div>
    </footer>
  );
}
