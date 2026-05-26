// FILE: components/LanguageSelector.tsx
// Functional i18n via Google Translate widget injection.
// Falls back to localStorage locale preference.
"use client";
import { useState, useRef, useEffect } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const LANGS = [
  { code:"en", label:"English",   flag:"🇺🇸", gt:"en" },
  { code:"es", label:"Español",   flag:"🇪🇸", gt:"es" },
  { code:"pt", label:"Português", flag:"🇧🇷", gt:"pt" },
  { code:"fr", label:"Français",  flag:"🇫🇷", gt:"fr" },
  { code:"de", label:"Deutsch",   flag:"🇩🇪", gt:"de" },
  { code:"zh", label:"中文",       flag:"🇨🇳", gt:"zh-CN" },
  { code:"ja", label:"日本語",     flag:"🇯🇵", gt:"ja" },
  { code:"ko", label:"한국어",     flag:"🇰🇷", gt:"ko" },
  { code:"ar", label:"العربية",   flag:"🇸🇦", gt:"ar" },
  { code:"ru", label:"Русский",   flag:"🇷🇺", gt:"ru" },
] as const;

type LangCode = typeof LANGS[number]["code"];

function injectGoogleTranslate(gtCode: string) {
  // Remove existing translate elements
  const existing = document.getElementById("google_translate_element");
  if (existing) existing.innerHTML = "";

  // Add script if not present
  if (!document.getElementById("gt-script")) {
    const s = document.createElement("script");
    s.id = "gt-script";
    s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateInit";
    document.head.appendChild(s);
  }

  // Set target language and trigger
  (window as any).googleTranslateInit = () => {
    new (window as any).google.translate.TranslateElement(
      { pageLanguage:"en", includedLanguages: LANGS.map(l=>l.gt).join(","),
        layout:(window as any).google?.translate?.TranslateElement?.InlineLayout?.SIMPLE,
        autoDisplay:false },
      "google_translate_element"
    );
    // Trigger translation after init
    setTimeout(() => triggerTranslate(gtCode), 300);
  };

  // If already loaded, trigger directly
  if ((window as any).google?.translate) {
    triggerTranslate(gtCode);
  }
}

function triggerTranslate(gtCode: string) {
  if (gtCode === "en") {
    // Restore original
    const sel = document.querySelector(".goog-te-combo") as HTMLSelectElement;
    if (sel) { sel.value = "en"; sel.dispatchEvent(new Event("change")); }
    return;
  }
  const sel = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
  if (sel) {
    sel.value = gtCode;
    sel.dispatchEvent(new Event("change"));
  } else {
    // Retry
    setTimeout(() => triggerTranslate(gtCode), 500);
  }
}

export function LanguageSelector() {
  const [current, setCurrent] = useState<LangCode>("en");
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("abraxas_lang") as LangCode | null;
    if (saved && saved !== "en") {
      setCurrent(saved);
      const lang = LANGS.find(l => l.code === saved);
      if (lang) injectGoogleTranslate(lang.gt);
    }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!mounted) return null;

  const active = LANGS.find(l => l.code === current) ?? LANGS[0];

  function select(lang: typeof LANGS[number]) {
    setCurrent(lang.code);
    localStorage.setItem("abraxas_lang", lang.code);
    injectGoogleTranslate(lang.gt);
    setOpen(false);
  }

  return (
    <>
      {/* Hidden Google Translate mount point */}
      <div id="google_translate_element" style={{ display:"none" }}/>

      <div ref={ref} style={{ position:"relative" }}>
        <button onClick={() => setOpen(o => !o)} style={{
          display:"flex", alignItems:"center",
          gap:"0.3rem", padding:"0.25rem 0.5rem",
          borderRadius:"4px",
          border:`1px solid ${open ? "#1F2937" : "rgba(31,41,55,0.5)"}`,
          background: open ? "rgba(255,255,255,0.04)" : "transparent",
          cursor:"pointer", transition:"all 0.15s",
        }}>
          <span style={{ fontSize:"0.75rem", lineHeight:1 }}>{active.flag}</span>
          <span style={{ fontFamily:M, fontSize:"0.36rem", fontWeight:700,
                          color:"rgba(255,255,255,0.4)",
                          letterSpacing:"0.08em" }}>
            {active.code.toUpperCase()}
          </span>
          <span style={{ fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                          transform: open ? "rotate(180deg)" : "none",
                          transition:"transform 0.2s", display:"inline-block" }}>▾</span>
        </button>

        {open && (
          <div style={{
            position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:500,
            background:"#0E1117", border:"1px solid #1F2937",
            borderRadius:"6px", minWidth:150, overflow:"hidden",
            boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
          }}>
            {LANGS.map((lang, i) => {
              const isActive = lang.code === current;
              return (
                <button key={lang.code} onClick={() => select(lang)} style={{
                  width:"100%", padding:"0.5rem 0.75rem",
                  background: isActive ? "rgba(16,185,129,0.08)" : "transparent",
                  border:"none", borderBottom: i < LANGS.length-1 ? "1px solid rgba(31,41,55,0.5)" : "none",
                  cursor:"pointer", textAlign:"left",
                  display:"flex", alignItems:"center", gap:"0.5rem",
                  transition:"background 0.1s",
                }}>
                  <span style={{ fontSize:"0.7rem" }}>{lang.flag}</span>
                  <span style={{ fontFamily:M, fontSize:"0.42rem",
                                  color: isActive ? "#10B981" : "rgba(255,255,255,0.5)",
                                  fontWeight: isActive ? 800 : 400 }}>
                    {lang.label}
                  </span>
                  {isActive && (
                    <span style={{ marginLeft:"auto", fontSize:"0.36rem",
                                    color:"#10B981" }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
