// FILE: components/LanguageSelector.tsx
// Custom language selector — Google Translate backend, fully custom UI.
// Dropdown uses position:fixed so it's NEVER clipped by overflow:hidden parents.
"use client";

import { useState, useEffect, useRef } from "react";

const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S   = "system-ui,-apple-system,sans-serif";
const G   = "#10B981";
const BDR = "#1C2333";
const W   = "#F8FAFC";

interface Lang { code: string; name: string; flag: string; }

const LANGS: Lang[] = [
  { code: "en", name: "English",   flag: "🇺🇸" },
  { code: "es", name: "Español",   flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "fr", name: "Français",  flag: "🇫🇷" },
  { code: "de", name: "Deutsch",   flag: "🇩🇪" },
  { code: "zh", name: "中文",       flag: "🇨🇳" },
];

declare global {
  interface Window {
    google?: { translate: { TranslateElement: new (cfg: object, id: string) => unknown } };
    googleTranslateElementInit?: () => void;
  }
}

export function LanguageSelector() {
  const [open,    setOpen]    = useState(false);
  const [current, setCurrent] = useState<Lang>(LANGS[0]);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mount Google Translate (hidden)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("abraxas-gt-script")) return;

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement({
        pageLanguage: "en",
        includedLanguages: LANGS.map(l => l.code).join(","),
        autoDisplay: false,
        layout: 0,
      }, "abraxas-gt-root");
    };

    const s = document.createElement("script");
    s.id = "abraxas-gt-script";
    s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);

    // Restore saved language
    const saved = localStorage.getItem("abraxas_lang_v2");
    if (saved && saved !== "en") {
      const lang = LANGS.find(l => l.code === saved);
      if (lang) setCurrent(lang);
    }
  }, []);

  // Close on outside click — using fixed-position panel ref
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inBtn   = btnRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inBtn && !inPanel) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function applyGT(code: string) {
    const sel = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (sel) { sel.value = code; sel.dispatchEvent(new Event("change")); }
  }

  function openDropdown() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({
        top:   r.bottom + window.scrollY + 6,
        right: window.innerWidth - r.right,
      });
    }
    setOpen(o => !o);
  }

  function pick(lang: Lang) {
    setOpen(false);
    setCurrent(lang);
    localStorage.setItem("abraxas_lang_v2", lang.code);
    if (lang.code === "en") {
      // Reset translation by clearing the cookie then reload
      const reset = (domain: string) => {
        document.cookie = `googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=${domain}`;
      };
      reset(window.location.hostname);
      reset("." + window.location.hostname);
      window.location.reload();
      return;
    }
    applyGT(lang.code);
  }

  return (
    <>
      {/* Hidden Google Translate widget root */}
      <div id="abraxas-gt-root" style={{
        position: "fixed", bottom: 0, left: "-9999px",
        width: 1, height: 1, overflow: "hidden", opacity: 0,
        pointerEvents: "none", zIndex: -1,
      }} />

      {/* Nuke all Google Translate injected UI */}
      <style>{`
        .goog-te-banner-frame{display:none!important}
        .skiptranslate iframe{display:none!important;visibility:hidden!important}
        body{top:0!important;position:static!important}
        .goog-te-gadget{font-size:0!important;color:transparent!important}
        .goog-te-gadget a{display:none!important}
        .goog-te-gadget .goog-te-combo{display:none!important}
        #goog-gt-tt,.goog-te-balloon-frame{display:none!important}
        .goog-text-highlight{background:none!important;box-shadow:none!important}
      `}</style>

      {/* Trigger button */}
      <button
        ref={btnRef}
        onClick={openDropdown}
        className="notranslate"
        style={{
          padding: "0.45rem 0.875rem", borderRadius: 5, flexShrink: 0,
          border: `1px solid ${BDR}`, background: "rgba(13,17,23,0.8)",
          backdropFilter: "blur(4px)",
          color: W, fontFamily: M, fontSize: "0.875rem", fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
          whiteSpace: "nowrap", lineHeight: 1,
        }}
        aria-label="Change language"
        aria-expanded={open}
      >
        <span role="img" aria-label={current.name} style={{ fontSize: "1rem" }}>
          {current.flag}
        </span>
        <span style={{ letterSpacing: "0.06em" }}>
          {current.code.toUpperCase()}
        </span>
        <span style={{ color: G, fontSize: "0.65rem", marginLeft: 1 }}>▾</span>
      </button>

      {/* Dropdown — position:fixed so it clears ALL overflow:hidden ancestors */}
      {open && (
        <div
          ref={panelRef}
          className="notranslate"
          style={{
            position: "fixed",
            top: dropPos.top,
            right: dropPos.right,
            minWidth: 200,
            background: "#0D1117",
            border: `1px solid ${G}40`,
            borderRadius: 7,
            padding: "0.375rem",
            boxShadow: "0 16px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(16,185,129,0.08)",
            zIndex: 99999,
          }}
        >
          {LANGS.map(lang => {
            const active = lang.code === current.code;
            return (
              <button
                key={lang.code}
                onClick={() => pick(lang)}
                style={{
                  width: "100%", padding: "0.625rem 0.875rem", borderRadius: 4,
                  border: "none", background: active ? `${G}15` : "transparent",
                  color: active ? G : W,
                  fontFamily: S, fontSize: "0.9rem", fontWeight: active ? 700 : 400,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  gap: "0.75rem", textAlign: "left", transition: "background 0.1s",
                }}
                onMouseEnter={e => {
                  if (!active)(e.currentTarget.style.background = "rgba(255,255,255,0.05)");
                }}
                onMouseLeave={e => {
                  if (!active)(e.currentTarget.style.background = "transparent");
                }}
              >
                <span style={{ fontSize: "1.125rem" }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.name}</span>
                {active && <span style={{ color: G, fontWeight: 900, fontSize: "0.8rem" }}>✓</span>}
              </button>
            );
          })}
          <div style={{
            height: 1, background: BDR, margin: "0.375rem 0",
          }} />
          <div style={{ padding: "0.4rem 0.875rem", fontFamily: M,
                         fontSize: "0.65rem", color: "rgba(255,255,255,0.25)",
                         letterSpacing: "0.06em" }}>
            Powered by Google Translate
          </div>
        </div>
      )}
    </>
  );
}
