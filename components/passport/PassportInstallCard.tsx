"use client";
// FILE: components/passport/PassportInstallCard.tsx
// Chromium install prompt for the holder-facing Passport. Hidden when unavailable or already installed.

import { useEffect, useState } from "react";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const FONT = ABRAXAS_FONT_SANS;

export function PassportInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onInstallable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installPrompt) return null;

  async function install() {
    const prompt = installPrompt;
    if (!prompt) return;

    setInstalling(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <section
      aria-labelledby="passport-install-heading"
      style={{
        background: PUBLIC_SURFACE.cardBackground,
        border: "1px solid rgba(94,234,212,0.22)",
        borderRadius: PUBLIC_SURFACE.cardRadius,
        padding: PUBLIC_SURFACE.cardPadding,
        marginBottom: "1rem",
      }}
    >
      <p style={{
        fontFamily: FONT,
        fontSize: "0.72rem",
        fontWeight: 700,
        color: "#5EEAD4",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        margin: "0 0 0.35rem",
      }}>
        Quick access
      </p>
      <h2 id="passport-install-heading" style={{
        fontFamily: FONT,
        fontSize: "0.95rem",
        fontWeight: 800,
        margin: "0 0 0.35rem",
        color: "var(--text-primary)",
      }}>
        Install Abraxas Passport
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.8rem",
        lineHeight: 1.55,
        color: "var(--text-secondary)",
        margin: "0 0 0.8rem",
      }}>
        Add Passport to this device for direct access to verification requests, reusable results, and activity.
      </p>
      <button
        type="button"
        onClick={() => void install()}
        disabled={installing}
        style={{
          width: "100%",
          padding: "0.65rem 0.85rem",
          borderRadius: 10,
          border: "1px solid rgba(94,234,212,0.38)",
          background: "rgba(94,234,212,0.14)",
          color: "#5EEAD4",
          fontFamily: FONT,
          fontSize: "0.82rem",
          fontWeight: 800,
          cursor: installing ? "wait" : "pointer",
          opacity: installing ? 0.65 : 1,
        }}
      >
        {installing ? "Opening install prompt…" : "Install Passport"}
      </button>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.7rem",
        lineHeight: 1.5,
        color: "var(--text-muted)",
        margin: "0.65rem 0 0",
      }}>
        Installation adds an app shortcut. Verification data and receipts still load securely from Abraxas.
      </p>
    </section>
  );
}
