// FILE: components/LanguageSelector.tsx
// Language selector — English by default. Translation is opt-in only.
// Fixes: stale googtrans cookies, failed English reset, browser auto-translate flash.
"use client";

import { useState, useEffect, useRef } from "react";
import {
  applyGoogleTranslateLanguage,
  clearGoogleTranslateCookies,
  pinEnglishCookies,
  readLanguagePreference,
  resetToEnglish,
  setDocumentLanguage,
  writeLanguagePreference,
} from "@/lib/i18n/googleTranslate";

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
  { code: "zh-CN", name: "中文",   flag: "🇨🇳" },
];

declare global {
  interface Window {
    google?: { translate: { TranslateElement: new (cfg: object, id: string) => unknown } };
    googleTranslateElementInit?: () => void;
  }
}

function langFromPreference(code: string): Lang {
  return LANGS.find(l => l.code === code) ?? LANGS[0];
}

export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Lang>(LANGS[0]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const appliedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pref = readLanguagePreference();
    setCurrent(langFromPreference(pref));

    if (pref === "en") {
      clearGoogleTranslateCookies();
      pinEnglishCookies();
      setDocumentLanguage("en");
    }

    if (document.getElementById("abraxas-gt-script")) {
      setReady(true);
      return;
    }

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement({
        pageLanguage: "en",
        includedLanguages: LANGS.map(l => l.code).join(","),
        autoDisplay: false,
        layout: 0,
      }, "abraxas-gt-root");
      setReady(true);
    };

    const s = document.createElement("script");
    s.id = "abraxas-gt-script";
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || appliedRef.current) return;
    const pref = readLanguagePreference();
    if (pref === "en") {
      appliedRef.current = true;
      return;
    }
    appliedRef.current = true;
    void applyGoogleTranslateLanguage(pref).then(ok => {
      if (!ok) {
        writeLanguagePreference("en");
        setCurrent(LANGS[0]);
        setDocumentLanguage("en");
      }
    });
  }, [ready]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function openDropdown() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({
        top: r.bottom + window.scrollY + 6,
        right: window.innerWidth - r.right,
      });
    }
    setOpen(o => !o);
  }

  async function pick(lang: Lang) {
    setOpen(false);
    if (lang.code === current.code && lang.code === readLanguagePreference()) return;

    setBusy(true);
    setCurrent(lang);
    writeLanguagePreference(lang.code);

    if (lang.code === "en") {
      await resetToEnglish();
      setBusy(false);
      window.location.reload();
      return;
    }

    setDocumentLanguage(lang.code);
    const ok = await applyGoogleTranslateLanguage(lang.code);
    setBusy(false);
    if (!ok) {
      writeLanguagePreference("en");
      setCurrent(LANGS[0]);
      setDocumentLanguage("en");
    }
  }

  return (
    <>
      <div id="abraxas-gt-root" style={{
        position: "fixed", bottom: 0, left: "-9999px",
        width: 1, height: 1, overflow: "hidden", opacity: 0,
        pointerEvents: "none", zIndex: -1,
      }} />

      <style>{`
        .goog-te-banner-frame{display:none!important}
        .skiptranslate iframe{display:none!important;visibility:hidden!important}
        body{top:0!important;position:static!important}
        .goog-te-gadget{font-size:0!important;color:transparent!important}
        .goog-te-gadget a{display:none!important}
        .goog-te-gadget .goog-te-combo{display:none!important}
        #goog-gt-tt,.goog-te-balloon-frame{display:none!important}
        .goog-text-highlight{background:none!important;box-shadow:none!important}
        html.translated-ltr, html.translated-rtl { top: 0 !important; }
      `}</style>

      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
        disabled={busy}
        className="notranslate abx-interactive"
        style={{
          padding: "0.45rem 0.875rem", borderRadius: 5, flexShrink: 0,
          border: `1px solid ${BDR}`, background: "rgba(13,17,23,0.8)",
          backdropFilter: "blur(4px)",
          color: W, fontFamily: M, fontSize: "0.875rem", fontWeight: 700,
          cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
          whiteSpace: "nowrap", lineHeight: 1, minHeight: 44,
          opacity: busy ? 0.7 : 1,
        }}
        aria-label="Change language"
        aria-expanded={open}
        aria-busy={busy || undefined}
      >
        <span role="img" aria-label={current.name} style={{ fontSize: "1rem" }}>
          {current.flag}
        </span>
        <span style={{ letterSpacing: "0.06em" }}>
          {current.code === "zh-CN" ? "ZH" : current.code.toUpperCase()}
        </span>
        <span style={{ color: G, fontSize: "0.65rem", marginLeft: 1 }}>▾</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="notranslate"
          role="menu"
          style={{
            position: "fixed",
            top: dropPos.top,
            right: dropPos.right,
            minWidth: 220,
            background: "#0D1117",
            border: `1px solid ${G}40`,
            borderRadius: 7,
            padding: "0.375rem",
            boxShadow: "0 16px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(16,185,129,0.08)",
            zIndex: 99999,
          }}
        >
          <div style={{
            padding: "0.45rem 0.875rem 0.35rem",
            fontFamily: S, fontSize: "0.72rem", color: "rgba(255,255,255,0.45)",
          }}>
            English is default · translate only when you choose
          </div>
          {LANGS.map(lang => {
            const active = lang.code === current.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitem"
                onClick={() => void pick(lang)}
                style={{
                  width: "100%", padding: "0.625rem 0.875rem", borderRadius: 4,
                  border: "none", background: active ? `${G}15` : "transparent",
                  color: active ? G : W,
                  fontFamily: S, fontSize: "0.9rem", fontWeight: active ? 700 : 400,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  gap: "0.75rem", textAlign: "left", transition: "background 0.1s",
                  minHeight: 44,
                }}
                onMouseEnter={e => {
                  if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={e => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: "1.125rem" }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.name}</span>
                {active && <span style={{ color: G, fontWeight: 900, fontSize: "0.8rem" }}>✓</span>}
              </button>
            );
          })}
          <div style={{ height: 1, background: BDR, margin: "0.375rem 0" }} />
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
