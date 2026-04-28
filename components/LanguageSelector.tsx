"use client";

import { useState, useRef, useEffect } from "react";

const LANGUAGES = [
  { code: "en", label: "English",    flag: "🇺🇸" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "pt", label: "Português",  flag: "🇧🇷" },
  { code: "zh", label: "中文",        flag: "🇨🇳" },
  { code: "ja", label: "日本語",      flag: "🇯🇵" },
  { code: "ko", label: "한국어",      flag: "🇰🇷" },
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "ar", label: "العربية",    flag: "🇸🇦" },
  { code: "hi", label: "हिन्दी",     flag: "🇮🇳" },
  { code: "ru", label: "Русский",    flag: "🇷🇺" },
];

/**
 * Language selector — uses Google Translate widget via script injection.
 * When a user picks a language, the entire page is translated.
 * The flag + code button is always visible in the nav.
 */
export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(LANGUAGES[0]);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (lang: typeof LANGUAGES[0]) => {
    setSelected(lang);
    setOpen(false);

    if (lang.code === "en") {
      // Reset to English
      const iframe = document.querySelector<HTMLIFrameElement>(".goog-te-banner-frame");
      if (iframe) {
        const btn = iframe.contentDocument?.querySelector<HTMLElement>(".goog-te-button button");
        btn?.click();
      }
      return;
    }

    // Trigger Google Translate
    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (select) {
      select.value = lang.code;
      select.dispatchEvent(new Event("change"));
    } else {
      // Fallback: open Google Translate in new tab
      window.open(
        `https://translate.google.com/translate?sl=en&tl=${lang.code}&u=${encodeURIComponent(window.location.href)}`,
        "_blank"
      );
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Hidden Google Translate element */}
      <div id="google_translate_element" style={{ display: "none" }} />

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Select language"
        style={{
          display: "flex", alignItems: "center", gap: "0.3rem",
          background: "none",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "6px",
          padding: "0.35rem 0.6rem",
          cursor: "pointer",
          color: "var(--muted)",
          fontSize: "0.7rem",
          fontFamily: "'Space Grotesk', sans-serif",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(200,169,110,0.4)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
      >
        <span style={{ fontSize: "0.9rem" }}>{selected.flag}</span>
        <span style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}>{selected.code}</span>
        <span style={{ fontSize: "0.5rem", opacity: 0.6 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "var(--mid)",
          border: "1px solid var(--line-bright)",
          borderRadius: "10px",
          padding: "0.5rem",
          zIndex: 100,
          minWidth: "160px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang)}
              style={{
                display: "flex", alignItems: "center", gap: "0.625rem",
                width: "100%", padding: "0.5rem 0.75rem",
                background: selected.code === lang.code ? "rgba(200,169,110,0.08)" : "none",
                border: "none", borderRadius: "6px",
                cursor: "pointer",
                color: selected.code === lang.code ? "var(--gold)" : "var(--text)",
                fontSize: "0.78rem",
                fontFamily: "'Space Grotesk', sans-serif",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (selected.code !== lang.code) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (selected.code !== lang.code) (e.currentTarget as HTMLElement).style.background = "none"; }}
            >
              <span style={{ fontSize: "1rem" }}>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}