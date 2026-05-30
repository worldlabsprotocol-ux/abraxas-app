"use client";
// FILE: components/LanguageSelector.tsx
// Google Translate — zero signup, zero API key.
// Script loaded in layout.tsx. This component just drives the hidden select.
import { useState, useRef, useEffect } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const LANGS = [
  { code:"en",    label:"English",    flag:"🇺🇸" },
  { code:"es",    label:"Español",    flag:"🇪🇸" },
  { code:"pt",    label:"Português",  flag:"🇧🇷" },
  { code:"fr",    label:"Français",   flag:"🇫🇷" },
  { code:"de",    label:"Deutsch",    flag:"🇩🇪" },
  { code:"zh-CN", label:"中文",        flag:"🇨🇳" },
  { code:"ja",    label:"日本語",      flag:"🇯🇵" },
  { code:"ko",    label:"한국어",      flag:"🇰🇷" },
  { code:"ar",    label:"العربية",    flag:"🇸🇦" },
  { code:"ru",    label:"Русский",    flag:"🇷🇺" },
] as const;

type Code = typeof LANGS[number]["code"];

function switchLang(code: Code) {
  // The hidden Google Translate select is the only reliable trigger
  const select = document.querySelector<HTMLSelectElement>(
    ".goog-te-combo, select.goog-te-combo"
  );
  if (!select) {
    // Widget not ready yet — retry once
    setTimeout(() => switchLang(code), 400);
    return;
  }
  if (code === "en") {
    // Restore: click the "Show original" link if present, else set to ""
    const restore = document.querySelector<HTMLElement>(".goog-te-menu-value");
    if (restore) restore.click();
    select.value = "";
    select.dispatchEvent(new Event("change"));
    // Remove Google's top bar
    const frame = document.querySelector<HTMLElement>(".goog-te-banner-frame");
    if (frame) frame.style.display = "none";
    document.body.style.top = "0";
    return;
  }
  select.value = code;
  select.dispatchEvent(new Event("change"));
}

export function LanguageSelector() {
  const [current, setCurrent] = useState<Code>("en");
  const [open,    setOpen]    = useState(false);
  const [ready,   setReady]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore saved language
    const saved = localStorage.getItem("abraxas_lang") as Code | null;
    if (saved) setCurrent(saved);

    // Check if Google Translate widget loaded
    const check = setInterval(() => {
      if (document.querySelector(".goog-te-combo")) {
        setReady(true);
        clearInterval(check);
        // Apply saved language
        if (saved && saved !== "en") switchLang(saved);
      }
    }, 300);

    // Close on outside click
    const outside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);

    return () => {
      clearInterval(check);
      document.removeEventListener("mousedown", outside);
    };
  }, []);

  function select(lang: typeof LANGS[number]) {
    setCurrent(lang.code);
    localStorage.setItem("abraxas_lang", lang.code);
    switchLang(lang.code);
    setOpen(false);
  }

  const active = LANGS.find(l => l.code === current) ?? LANGS[0];

  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={ready ? "Switch language" : "Translator loading…"}
        style={{
          display:"flex", alignItems:"center", gap:"0.3rem",
          padding:"0.25rem 0.5rem", borderRadius:"4px",
          border:`1px solid ${open ? "#1F2937" : "rgba(31,41,55,0.5)"}`,
          background: open ? "rgba(255,255,255,0.04)" : "transparent",
          cursor:"pointer", transition:"all 0.15s",
          opacity: ready ? 1 : 0.5,
        }}
      >
        <span style={{ fontSize:"0.75rem", lineHeight:1 }}>{active.flag}</span>
        <span style={{
          fontFamily:M, fontSize:"0.34rem", fontWeight:700,
          color:"rgba(255,255,255,0.45)", letterSpacing:"0.08em",
        }}>
          {active.code === "en" ? "EN" : active.code.split("-")[0].toUpperCase()}
        </span>
        <span style={{
          fontSize:"0.28rem", color:"rgba(255,255,255,0.2)",
          transform: open ? "rotate(180deg)" : "none",
          transition:"transform 0.2s", display:"inline-block",
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", right:0, zIndex:500,
          background:"#0E1117", border:"1px solid #1F2937",
          borderRadius:"6px", minWidth:148, overflow:"hidden",
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
        }}>
          {LANGS.map((lang, i) => {
            const isActive = lang.code === current;
            return (
              <button key={lang.code} onClick={() => select(lang)} style={{
                width:"100%", padding:"0.5rem 0.75rem",
                background: isActive ? "rgba(16,185,129,0.08)" : "transparent",
                border:"none",
                borderBottom: i < LANGS.length - 1 ? "1px solid rgba(31,41,55,0.5)" : "none",
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
