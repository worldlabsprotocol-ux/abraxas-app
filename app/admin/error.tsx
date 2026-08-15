"use client";
// FILE: app/admin/error.tsx
// Recoverable error boundary for admin routes.

import { useEffect } from "react";
import Link from "next/link";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "50vh",
      display: "grid",
      placeItems: "center",
      padding: "2rem 1rem",
      background: "#0a0c10",
      color: "#f0f0f0",
    }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
          letterSpacing: "0.1em", color: ACCENT, marginBottom: "0.5rem",
        }}>
          ADMIN CONSOLE
        </div>
        <h1 style={{
          fontFamily: FONT, fontSize: "1.2rem", fontWeight: 800,
          margin: "0 0 0.65rem",
        }}>
          Something went wrong
        </h1>
        <p style={{
          fontFamily: FONT, fontSize: "0.82rem",
          color: "rgba(255,255,255,0.6)", lineHeight: 1.65,
          margin: "0 0 1.25rem",
        }}>
          This admin page hit an unexpected error. Try again, or return to a known admin route.
        </p>
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.55rem 1rem", borderRadius: 8, border: "none",
              background: ACCENT, color: "#000", fontFamily: FONT,
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Try again
          </button>
          <Link
            href="/admin/identity"
            style={{
              padding: "0.55rem 1rem", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent", color: "#f0f0f0",
              fontFamily: FONT, fontWeight: 600, textDecoration: "none",
            }}
          >
            Open Identity
          </Link>
        </div>
      </div>
    </div>
  );
}
