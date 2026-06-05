// FILE: components/LanguageSelector.tsx
// Custom language dropdown — no Google Translate banner, proper z-index,
// readable sizing. Uses Google Translate API silently for actual translation.

"use client";

import { useState, useEffect, useRef } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";
const BDR = "#1C2333";
const CARD = "#0D1117";
const W = "#F8FAFC";

interface Lang { code: string; name: string; flag: string; }

const LANGUAGES: Lang[] = [
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
  const [open, setOpen]       = useState(false);
  const [current, setCurrent] = useState<Lang>(LANGUAGES[0]);
  const [ready,   setReady]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Initialize Google Translate (hidden)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("gt-script")) {
      setReady(true);
      return;
    }
    window.googleTranslateElementInit = () => {
      if (window.google?.translate) {
        new window.google.translate.TranslateElement({
          pageLanguage: "en",
          includedLanguages: LANGUAGES.map(l => l.code).join(","),
          autoDisplay: false,
          layout: 0,
        }, "google_translate_element");
        setTimeout(() => setReady(true), 500);
      }
    };
    const s = document.createElement("script");
    s.id = "gt-script";
    s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);

    // Restore saved language
    const saved = localStorage.getItem("abraxas_lang");
    if (saved) {
      const lang = LANGUAGES.find(l => l.code === saved);
      if (lang) setCurrent(lang);
    }
  }, []);

  // Apply saved language once Google is ready
  useEffect(() => {
    if (!ready) return;
    if (current.code === "en") return;
    setTimeout(() => applyTranslate(current.code), 300);
  }, [ready, current.code]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function applyTranslate(code: string) {
    const sel = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (sel) {
      sel.value = code;
      sel.dispatchEvent(new Event("change"));
    }
  }

  function pick(lang: Lang) {
    setCurrent(lang);
    setOpen(false);
    localStorage.setItem("abraxas_lang", lang.code);
    if (lang.code === "en") {
      // Reset by removing the googtrans cookie
      document.cookie = "googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "googtrans=;path=/;domain=." + window.location.hostname + ";expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.reload();
      return;
    }
    applyTranslate(lang.code);
  }

  return (
    <>
      {/* Hidden Google Translate root */}
      <div id="google_translate_element" style={{
        position: "absolute", width: 0, height: 0, overflow: "hidden",
        opacity: 0, pointerEvents: "none",
      }}/>

      {/* Aggressive CSS to hide all Google Translate UI */}
      <style jsx global>{`
        .goog-te-banner-frame.skiptranslate { display: none !important; }
        body { top: 0 !important; position: static !important; }
        .goog-te-gadget { font-size: 0 !important; }
        .goog-te-gadget > span > a { display: none !important; }
        .goog-te-gadget .goog-te-combo { display: none !important; }
        .goog-tooltip,
        .goog-tooltip:hover,
        .goog-text-highlight {
          background-color: transparent !important;
          box-shadow: none !important;
          border: none !important;
        }
        .skiptranslate iframe { display: none !important; visibility: hidden !important; }
        #goog-gt-tt { display: none !important; }
      `}</style>

      <div ref={ref} className="notranslate" style={{ position: "relative", zIndex: 500 }}>
        <button onClick={() => setOpen(o => !o)} style={{
          padding: "0.5rem 0.875rem", borderRadius: 5,
          border: `1px solid ${BDR}`, background: "rgba(13,17,23,0.7)",
          backdropFilter: "blur(4px)",
          color: W, fontFamily: M, fontSize: "0.875rem", fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
          whiteSpace: "nowrap", lineHeight: 1,
        }}>
          <span style={{ fontSize: "1rem" }}>{current.flag}</span>
          <span style={{ letterSpacing: "0.05em" }}>{current.code.toUpperCase()}</span>
          <span style={{ fontSize: "0.7rem", color: `${G}`, marginLeft: 2 }}>▾</span>
        </button>

        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            minWidth: 200, background: CARD,
            border: `1px solid ${G}40`, borderRadius: 6,
            boxShadow: `0 12px 32px rgba(0,0,0,0.7), 0 0 0 1px ${G}10`,
            padding: "0.375rem",
            zIndex: 9999,
          }}>
            {LANGUAGES.map(lang => {
              const active = lang.code === current.code;
              return (
                <button key={lang.code} onClick={() => pick(lang)} style={{
                  width: "100%", padding: "0.625rem 0.75rem", borderRadius: 4,
                  border: "none", background: active ? `${G}15` : "transparent",
                  color: active ? G : W,
                  fontFamily: M, fontSize: "0.875rem", fontWeight: active ? 700 : 500,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "0.625rem",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!active) (e.target as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) (e.target as HTMLElement).style.background = "transparent"; }}>
                  <span style={{ fontSize: "1.125rem" }}>{lang.flag}</span>
                  <span style={{ flex: 1 }}>{lang.name}</span>
                  {active && <span style={{ color: G, fontWeight: 900 }}>✓</span>}
                </button>
              );
            })}
            <div style={{ height: 1, background: BDR, margin: "0.375rem 0" }}/>
            <div style={{ padding: "0.5rem 0.75rem", fontFamily: M,
                           fontSize: "0.7rem", color: "rgba(255,255,255,0.35)",
                           letterSpacing: "0.05em" }}>
              Powered by Google Translate
            </div>
          </div>
        )}
      </div>
    </>
  );
}
