// FILE: components/vos/VerificationTerminal.tsx
// Abraxas Verification OS — contained terminal section.
// Uncontrolled input keeps mobile keyboard open.
// Keyframe injected via useEffect (style jsx global breaks Next.js App Router).
"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { commandRegistry } from "@/lib/vos/commandRegistry";
import { assetRegistry }   from "@/lib/vos/assetRegistry";
import "@/lib/vos/commands";
import type { LogLine }    from "@/lib/vos/types";

/* ── design tokens ─────────────────────────────────────────────── */
const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const BG  = "#06090E";
const BDR = "#1C2333";
const G   = "#10B981";
const A   = "#F59E0B";
const B   = "#3B82F6";
const R   = "#EF4444";
const W   = "#F8FAFC";
const DIM = "rgba(255,255,255,0.38)";

const BANNER =
  "ABRAXAS VERIFICATION OS  ·  Build 2025.1  ·  Solana Mainnet\n" +
  "─────────────────────────────────────────────────────────────\n" +
  "Type 'help' to list commands.  Try: inspect AAS-1  ·  my assets  ·  demo";

const QUICK = [
  { label: "help",          cmd: "help"          },
  { label: "inspect AAS-1", cmd: "inspect AAS-1" },
  { label: "oracle AAS-1",  cmd: "oracle AAS-1"  },
  { label: "my assets",     cmd: "my assets"     },
  { label: "queue",         cmd: "queue"         },
  { label: "portfolio",     cmd: "portfolio"     },
];

function lineColor(k: LogLine["kind"]) {
  switch (k) {
    case "error":  return R;
    case "agent":  return DIM;
    case "data":   return B;
    case "user":   return W;
    default:       return "rgba(255,255,255,0.72)";
  }
}

/* ── InputBar ── uncontrolled so keyboard never dismisses ────────── */
const InputBar = memo(function InputBar({
  onSubmit, busy, history,
}: { onSubmit(v: string): void; busy: boolean; history: string[] }) {
  const inp  = useRef<HTMLInputElement>(null);
  const hidx = useRef(-1);

  useEffect(() => { if (!busy) inp.current?.focus({ preventScroll: true }); }, [busy]);

  const fire = useCallback(() => {
    const v = inp.current?.value?.trim() ?? "";
    if (busy || !v) return;
    onSubmit(v);
    if (inp.current) inp.current.value = "";
    hidx.current = -1;
    requestAnimationFrame(() => inp.current?.focus({ preventScroll: true }));
  }, [busy, onSubmit]);

  const onKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")     { e.preventDefault(); fire(); return; }
    if (e.key === "ArrowUp")   {
      e.preventDefault();
      if (!history.length) return;
      const n = hidx.current < 0 ? history.length - 1 : Math.max(0, hidx.current - 1);
      hidx.current = n;
      if (inp.current) inp.current.value = history[n];
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hidx.current < 0) return;
      const n = hidx.current + 1;
      if (n >= history.length) { hidx.current = -1; if (inp.current) inp.current.value = ""; }
      else { hidx.current = n; if (inp.current) inp.current.value = history[n]; }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const cur = (inp.current?.value ?? "").toLowerCase();
      const m = commandRegistry.all().find(c => c.name.startsWith(cur) && !c.future);
      if (m && inp.current) inp.current.value = m.name + " ";
    }
  }, [history, fire]);

  return (
    <div style={{
      borderTop: `1px solid ${BDR}`, background: "#040710",
      padding: "0.625rem 0.875rem",
      display: "flex", alignItems: "center", gap: "0.5rem",
      flexShrink: 0, position: "sticky", bottom: 0, zIndex: 10,
    }}>
      <span style={{ color: G, fontWeight: 700, fontSize: "0.875rem",
                      letterSpacing: "0.04em", flexShrink: 0, fontFamily: M }}>
        vos&gt;
      </span>
      <input
        ref={inp}
        defaultValue=""
        onKeyDown={onKey}
        disabled={busy}
        placeholder="type a command…"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="go"
        style={{
          flex: 1, minWidth: 0, background: "transparent",
          border: "none", outline: "none",
          color: W, fontFamily: M,
          /* 16px prevents iOS auto-zoom on focus */
          fontSize: "16px",
          caretColor: G, padding: "0.125rem 0",
        }}
      />
      <button
        onClick={fire}
        disabled={busy}
        style={{
          padding: "0.375rem 0.75rem", borderRadius: 4, flexShrink: 0,
          border: `1px solid ${G}`, background: `${G}18`,
          color: G, fontFamily: M, fontSize: "0.75rem", fontWeight: 700,
          cursor: busy ? "wait" : "pointer", opacity: busy ? 0.4 : 1,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}
      >
        RUN
      </button>
    </div>
  );
});

/* ── VerificationTerminal ─────────────────────────────────────── */
export function VerificationTerminal() {
  const [lines,   setLines]   = useState<LogLine[]>([
    { kind: "report", text: BANNER, ts: Date.now() },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [busy,    setBusy]    = useState(false);
  const scroll = useRef<HTMLDivElement>(null);

  /* Inject blink keyframe once into <head> — avoids style jsx global
     which doesn't work correctly in the Next.js 14 App Router.       */
  useEffect(() => {
    const id = "vos-blink";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = "@keyframes vosBlink{50%{opacity:0}}";
      document.head.appendChild(s);
    }
  }, []);

  /* Auto-scroll to bottom on new output */
  useEffect(() => {
    if (scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [lines]);

  const emit = useCallback((line: Omit<LogLine, "ts">) =>
    setLines(p => [...p, { ...line, ts: Date.now() }]), []);

  const run = useCallback(async (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (t === "clear" || t === "cls") {
      setLines([{ kind: "report", text: BANNER, ts: Date.now() }]);
      setHistory(h => [...h, t]);
      return;
    }
    emit({ kind: "user", text: t });
    setBusy(true);
    setHistory(h => [...h, t]);
    try { await commandRegistry.execute(t, assetRegistry, emit, history); }
    finally { setBusy(false); }
  }, [emit, history]);

  return (
    <div style={{
      background: BG, height: "100%",
      display: "flex", flexDirection: "column",
      fontFamily: M, color: W,
      overflow: "hidden", minHeight: 0,
    }}>
      {/* Status bar */}
      <div style={{
        background: "#030508", borderBottom: `1px solid ${BDR}`,
        padding: "0.35rem 0.875rem",
        display: "flex", alignItems: "center", gap: "1rem",
        fontSize: "0.65rem", color: DIM, flexShrink: 0, overflowX: "auto",
      }}>
        <span style={{ color: G, fontWeight: 700 }}>● ONLINE</span>
        <span>SOLANA MAINNET</span>
        <span style={{ color: A }}>
          REGISTRY · {assetRegistry.list().length} ASSET
          {assetRegistry.list().length !== 1 ? "S" : ""}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ color: "rgba(255,255,255,0.2)" }}>
          {new Date().toISOString().split("T")[0]}
        </span>
      </div>

      {/* Quick-command pills */}
      <div style={{
        background: "#07090F", borderBottom: `1px solid ${BDR}`,
        padding: "0.4rem 0.875rem",
        display: "flex", gap: "0.375rem",
        flexWrap: "nowrap", overflowX: "auto", flexShrink: 0,
      }}>
        {QUICK.map(q => (
          <button key={q.cmd} onClick={() => run(q.cmd)} disabled={busy} style={{
            padding: "0.3rem 0.625rem", borderRadius: 4, flexShrink: 0,
            border: `1px solid ${G}30`, background: `${G}06`,
            color: G, fontFamily: M, fontSize: "0.7rem",
            fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
            textTransform: "uppercase", letterSpacing: "0.07em",
            opacity: busy ? 0.5 : 1, whiteSpace: "nowrap",
          }}>
            {q.label}
          </button>
        ))}
      </div>

      {/* Output */}
      <div ref={scroll} style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "0.75rem 0.875rem", fontSize: "0.825rem", lineHeight: 1.75,
      }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            color: lineColor(l.kind),
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            marginBottom: l.kind === "report" ? "0.625rem" : "0.1rem",
            paddingLeft:  l.kind === "agent"  ? "0.875rem" : 0,
            borderLeft:   l.kind === "report" ? `2px solid ${G}30` : "none",
            paddingTop:    l.kind === "report" ? "0.5rem" : 0,
            paddingBottom: l.kind === "report" ? "0.5rem" : 0,
            paddingRight:  l.kind === "report" ? "0.625rem" : 0,
            background: l.kind === "report" ? `${G}03` : "transparent",
            borderRadius: l.kind === "report" ? 3 : 0,
          }}>
            {l.kind === "user" && (
              <span style={{ color: G, fontWeight: 700, marginRight: "0.4rem" }}>vos&gt;</span>
            )}
            {l.text}
          </div>
        ))}
        {busy && (
          <div style={{
            color: A, fontSize: "0.8rem", marginTop: "0.375rem",
            display: "flex", alignItems: "center", gap: "0.5rem",
          }}>
            <span style={{ animation: "vosBlink 1s steps(2) infinite" }}>▊</span>
            <span>processing…</span>
          </div>
        )}
      </div>

      <InputBar onSubmit={run} busy={busy} history={history} />
    </div>
  );
}
