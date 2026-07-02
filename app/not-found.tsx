"use client";

import Link from "next/link";
import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "2rem",
      position: "relative",
    }}>
      <div style={{ position: "absolute", width: "400px", height: "400px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.06)", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: "6rem",
          fontStyle: "italic",
          color: "rgba(200,169,110,0.2)",
          lineHeight: 1,
          marginBottom: "1.5rem",
          letterSpacing: "-0.02em",
        }}>
          404
        </div>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "1.5rem",
          letterSpacing: "-0.01em",
          marginBottom: "0.75rem",
        }}>
          This vault doesn't exist.
        </h1>

        <p style={{
          fontSize: "0.875rem",
          color: "var(--muted)",
          maxWidth: "340px",
          lineHeight: 1.7,
          marginBottom: "2.5rem",
        }}>
          The page you're looking for has been decommissioned, moved, or never existed.
          The agents are still operating. just not here.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/"><Button size="lg">Back to Home</Button></Link>
          <Link href="/marketplace"><Button size="lg" variant="ghost">Browse Vaults</Button></Link>
        </div>

        <p style={{ fontSize: "0.62rem", color: "var(--subtle)", marginTop: "2.5rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Abraxas · All systems operational
        </p>
      </div>
    </div>
  );
}