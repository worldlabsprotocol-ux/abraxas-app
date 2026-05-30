"use client";
// FILE: components/LanguageSelector.tsx
// Google Translate — zero signup, zero API key, zero visible Google UI.
// Translation runs silently. No banner. No toolbar. No layout shift.
// Script loaded at app level in layout.tsx.
import { useState, useRef, useEffect } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const LANGS = [
  { code:"en",    label:"English",   flag:"🇺🇸" },
  { code:"es",    label:"Español",   flag:"🇪🇸" },
  { code:"pt",    label:"Português", flag:"🇧🇷" },
  { code:"fr",    label:"Français",  flag:"🇫🇷" },
  { code:"de",    label:"Deutsch",   flag:"🇩🇪" },
  { code:"zh-CN", label:"中文",       flag:"🇨🇳" },
  { code:"ja",    label:"日本語",     flag:"🇯🇵" },
  { code:"ko",    label:"한국어",     flag:"🇰🇷" },
  { code:"ar",    label:"العربية",   flag:"🇸🇦" },
  { code:"ru",    label:"Русский",   flag:"🇷🇺" },
] as const;

type LangCode = typeof LANGS[number]["code"];
const STORAGE_KEY = "abraxas_lang";

// Suppress every Google Translate UI element after it injects
function suppressGoogleUI() {
  const selectors = [
    ".goog-te-banner-frame",
    ".goog-te-ftab-float",
    "#goog-gt-tt",
    ".goog-tooltip",
    ".VIpgJd-ZVi9od-aZ2wEe",
    ".VIpgJd-yAWNEb-L7lbkb",
  ];
  selectors.forEach(sel => {
    document.querySelectorAll<HTMLElement>(sel).forEach(el => {
      el.style.cssText = "display:none!important;height:0!important;";
    });
  });
  // Reset body position GT pushes down
  if (document.body.style.top && document.body.style.top !== "0px") {
    document.body.style.top = "0";
  }
}

function applyLanguage(code: LangCode) {
  const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!select) return false;

  if (code === "en") {
    // Restore original language
    select.value = "";
    select.dispatchEvent(new Event("change"));
  } else {
    select.value = code;
    select.dispatchEvent(new Event("change"));
  }

  // Suppress any GT UI that appeared after the change
  setTimeout(suppressGoogleUI, 100);
  setTimeout(suppressGoogleUI, 500);
  return true;
}

export function LanguageSelector() {
  const [current, setCurrent]   = useState<LangCode>("en");
  const [open,    setOpen]      = useState(false);
  const [ready,   setReady]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Watch for GT to inject its select element
    const poll = setInterval(() => {
      if (document.querySelector(".goog-te-combo")) {
        setReady(true);
        clearInterval(poll);

        // Set up MutationObserver to catch any GT UI injection
        const obs = new MutationObserver(() => suppressGoogleUI());
        obs.observe(document.body, { childList: true, subtree: true });

        // Restore saved language
        const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
        if (saved && saved !== "en") {
          setCurrent(saved);
          applyLanguage(saved);
        }
      }
    }, 200);

    // Close dropdown on outside click
    const outside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);

    return () => {
      clearInterval(poll);
      document.removeEventListener("mousedown", outside);
    };
  }, []);

  function select(lang: typeof LANGS[number]) {
    if (!ready) return;
    const applied = applyLanguage(lang.code);
    if (applied || lang.code === "en") {
      setCurrent(lang.code);
      localStorage.setItem(STORAGE_KEY, lang.code);
    }
    setOpen(false);
  }

  const active = LANGS.find(l => l.code === current) ?? LANGS[0];
  const displayCode = active.code === "en" ? "EN"
    : active.code === "zh-CN" ? "ZH"
    : active.code.split("-")[0].toUpperCase();

  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:"flex", alignItems:"center",
          gap:"0.3rem", padding:"0.25rem 0.5rem",
          borderRadius:"4px",
          border:`1px solid ${open ? "#1C2333" : "rgba(28,35,51,0.7)"}`,
          background: open ? "rgba(255,255,255,0.04)" : "transparent",
          cursor: ready ? "pointer" : "default",
          opacity: ready ? 1 : 0.4,
          transition:"all 0.15s",
        }}
      >
        <span style={{ fontSize:"0.75rem", lineHeight:1 }}>{active.flag}</span>
        <span style={{ fontFamily:M, fontSize:"0.34rem", fontWeight:700,
                        color:"rgba(255,255,255,0.4)", letterSpacing:"0.08em" }}>
          {displayCode}
        </span>
        <span style={{
          fontSize:"0.28rem", color:"rgba(255,255,255,0.2)",
          transform: open ? "rotate(180deg)" : "none",
          transition:"transform 0.2s", display:"inline-block",
        }}>▾</span>
      </button>

      {open && ready && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:600,
          background:"#0D1117", border:"1px solid #1C2333",
          borderRadius:"6px", minWidth:148, overflow:"hidden",
          boxShadow:"0 8px 32px rgba(0,0,0,0.7)",
        }}>
          {LANGS.map((lang, i) => {
            const isActive = lang.code === current;
            return (
              <button key={lang.code} onClick={() => select(lang)} style={{
                width:"100%", padding:"0.5rem 0.75rem",
                background: isActive ? "rgba(16,185,129,0.08)" : "transparent",
                border:"none",
                borderBottom: i < LANGS.length-1 ? "1px solid rgba(28,35,51,0.6)" : "none",
                cursor:"pointer", textAlign:"left",
                display:"flex", alignItems:"center", gap:"0.5rem",
                transition:"background 0.1s",
              }}>
                <span style={{ fontSize:"0.7rem" }}>{lang.flag}</span>
                <span style={{
                  fontFamily:M, fontSize:"0.42rem",
                  color: isActive ? "#10B981" : "rgba(255,255,255,0.5)",
                  fontWeight: isActive ? 800 : 400,
                }}>
                  {lang.label}
                </span>
                {isActive && (
                  <span style={{ marginLeft:"auto", fontSize:"0.36rem", color:"#10B981" }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
