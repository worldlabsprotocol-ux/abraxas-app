// FILE: components/LanguageSelector.tsx
// Prominent flag + language dropdown in the navbar.
// Uses Google Translate as a lightweight i18n bridge (no next-intl setup needed).
// Visible, animated, institutional.
"use client";

import { useState, useRef, useEffect } from "react";

const MONO = "'JetBrains Mono',monospace";

interface Lang { code: string; label: string; flag: string; }

const LANGS: Lang[] = [
  { code:"en", label:"English",    flag:"🇺🇸" },
  { code:"es", label:"Español",    flag:"🇪🇸" },
  { code:"pt", label:"Português",  flag:"🇧🇷" },
  { code:"fr", label:"Français",   flag:"🇫🇷" },
  { code:"de", label:"Deutsch",    flag:"🇩🇪" },
  { code:"zh", label:"中文",        flag:"🇨🇳" },
  { code:"ja", label:"日本語",      flag:"🇯🇵" },
  { code:"ko", label:"한국어",      flag:"🇰🇷" },
  { code:"ar", label:"العربية",    flag:"🇸🇦" },
  { code:"ru", label:"Русский",    flag:"🇷🇺" },
];

function getLang(): string {
  if (typeof window === "undefined") return "en";
  try { return localStorage.getItem("abraxas_lang") ?? navigator.language.split("-")[0] ?? "en"; }
  catch { return "en"; }
}

function applyLang(code: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("abraxas_lang", code); }
  catch {}
  const el = document.querySelector("html");
  if (el) el.lang = code;
  if (code !== "en") {
    const sel = document.querySelector("select.goog-te-combo") as HTMLSelectElement | null;
    if (sel) { sel.value = code; sel.dispatchEvent(new Event("change")); }
  }
}

export function LanguageSelector() {
  const [current, setCurrent]   = useState("en");
  const [open,    setOpen]      = useState(false);
  const [mounted, setMounted]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setCurrent(getLang());
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!mounted) return null;

  const active = LANGS.find(l => l.code === current) ?? LANGS[0];

  function select(lang: Lang) {
    setCurrent(lang.code);
    applyLang(lang.code);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Select language"
        style={{
          display:"flex", alignItems:"center", gap:"0.3rem",
          padding:"0.3rem 0.6rem", borderRadius:"5px",
          border:`1px solid ${open ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
          background: open ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
          cursor:"pointer", transition:"all 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
      >
        <span style={{ fontSize:"0.8rem", lineHeight:1 }}>{active.flag}</span>
        <span style={{ fontSize:"0.46rem", fontWeight:700, color:"rgba(255,255,255,0.55)",
                       fontFamily:MONO, letterSpacing:"0.06em" }}>
          {active.code.toUpperCase()}
        </span>
        <span style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.25)",
                       transition:"transform 0.2s",
                       transform: open ? "rotate(180deg)" : "rotate(0deg)",
                       display:"inline-block" }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:300,
          background:"rgba(10,12,20,0.98)", borderRadius:"8px",
          border:"1px solid rgba(255,255,255,0.09)",
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
          minWidth:160, overflow:"hidden",
          animation:"fadeIn 0.15s ease",
        }}>
          {LANGS.map((lang, i) => {
            const isActive = lang.code === current;
            return (
              <button key={lang.code} onClick={() => select(lang)} style={{
                width:"100%", padding:"0.55rem 0.875rem",
                background: isActive ? "rgba(124,58,237,0.12)" : "none",
                border:"none", cursor:"pointer", textAlign:"left",
                display:"flex", alignItems:"center", gap:"0.5rem",
                borderBottom: i < LANGS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                transition:"background 0.1s",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "none"; }}>
                <span style={{ fontSize:"0.75rem" }}>{lang.flag}</span>
                <span style={{ fontSize:"0.5rem", color: isActive ? "#a78bfa" : "rgba(255,255,255,0.55)",
                               fontFamily:MONO, fontWeight: isActive ? 800 : 400 }}>
                  {lang.label}
                </span>
                {isActive && (
                  <span style={{ marginLeft:"auto", fontSize:"0.44rem", color:"#a78bfa" }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
