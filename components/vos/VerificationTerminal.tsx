// FILE: components/vos/VerificationTerminal.tsx
// Bloomberg/Palantir-style verification terminal.
// Driven entirely by the command registry — UI never references specific commands.
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { commandRegistry } from "@/lib/vos/commandRegistry";
import { assetRegistry }    from "@/lib/vos/assetRegistry";
import "@/lib/vos/commands"; // side effect: registers all commands
import type { LogLine } from "@/lib/vos/types";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const BG   = "#070A0F";
const CARD = "#0D1117";
const BDR  = "#1C2333";
const G    = "#10B981";
const A    = "#F59E0B";
const B    = "#3B82F6";
const R    = "#EF4444";
const W    = "#F8FAFC";
const DIM  = "rgba(255,255,255,0.35)";

const BANNER = `
ABRAXAS VERIFICATION OS
─────────────────────────────────────────────────────────────
Asset Intelligence · Provenance · Custody · Collateral
Build 2025.1 · Solana Mainnet · AAS-1 Protocol

Type 'help' to begin. Try: inspect AAS-1
`.trim();

interface Suggestion { label: string; cmd: string; }
const QUICK_COMMANDS: Suggestion[] = [
  { label: "STATUS",            cmd: "status" },
  { label: "LIST REGISTRY",     cmd: "list" },
  { label: "INSPECT AAS-1",     cmd: "inspect AAS-1" },
  { label: "VERIFY AAS-1",      cmd: "verify AAS-1" },
  { label: "PROVENANCE AAS-1",  cmd: "show provenance AAS-1" },
  { label: "CUSTODY AAS-1",     cmd: "show custody AAS-1" },
  { label: "COLLATERAL AAS-1",  cmd: "show collateral AAS-1" },
  { label: "RISK AAS-1",        cmd: "show risk AAS-1" },
  { label: "HELP",              cmd: "help" },
];

function lineColor(kind: LogLine["kind"]): string {
  switch (kind) {
    case "user":   return W;
    case "agent":  return DIM;
    case "out":    return "rgba(255,255,255,0.7)";
    case "error":  return R;
    case "report": return W;
    case "data":   return B;
  }
}

export function VerificationTerminal() {
  const [lines, setLines]     = useState<LogLine[]>([
    { kind: "report", text: BANNER, ts: Date.now() },
  ]);
  const [input,   setInput]   = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [busy,    setBusy]    = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Autoscroll on new lines
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  const emit = useCallback((line: Omit<LogLine, "ts">) => {
    setLines(prev => [...prev, { ...line, ts: Date.now() }]);
  }, []);

  const run = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Handle clear directly
    if (trimmed.toLowerCase() === "clear" || trimmed.toLowerCase() === "cls") {
      setLines([{ kind: "report", text: BANNER, ts: Date.now() }]);
      setHistory(h => [...h, trimmed]);
      return;
    }

    setBusy(true);
    setHistory(h => [...h, trimmed]);
    setHistIdx(-1);
    try {
      await commandRegistry.execute(trimmed, assetRegistry, emit, history);
    } finally {
      setBusy(false);
    }
  }, [emit, history]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const v = input;
    setInput("");
    run(v);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= history.length) { setHistIdx(-1); setInput(""); }
      else { setHistIdx(next); setInput(history[next]); }
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Simple completion: match first command starting with current input
      const all = commandRegistry.all();
      const match = all.find(c => c.name.startsWith(input.toLowerCase()) && !c.future);
      if (match) setInput(match.name + " ");
    }
  };

  return (
    <div style={{
      background: BG, minHeight: "100vh", display: "flex", flexDirection: "column",
      fontFamily: M, color: W,
    }}>
      {/* ── Banner row ────────────────────────────────────────────────── */}
      <div style={{
        background: "#040608", borderBottom: `1px solid ${BDR}`,
        padding: "0.5rem clamp(0.75rem,2.5vw,1.5rem)",
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        fontSize: "0.36rem", color: DIM,
      }}>
        <span style={{ color: G, fontWeight: 700 }}>● VOS-1 ONLINE</span>
        <span>NODE: SOLANA-MAINNET</span>
        <span>PROTOCOL: AAS-1</span>
        <span style={{ color: A }}>REGISTRY: {assetRegistry.list().length} ASSETS</span>
        <span style={{ flex: 1 }} />
        <span>{new Date().toISOString().split("T")[0]}</span>
      </div>

      {/* ── Quick command bar ─────────────────────────────────────────── */}
      <div style={{
        background: CARD, borderBottom: `1px solid ${BDR}`,
        padding: "0.5rem clamp(0.75rem,2.5vw,1.5rem)",
        display: "flex", gap: "0.375rem", flexWrap: "wrap",
        overflowX: "auto",
      }}>
        {QUICK_COMMANDS.map(q => (
          <button key={q.cmd} onClick={() => run(q.cmd)} disabled={busy} style={{
            padding: "0.25rem 0.625rem", borderRadius: 3,
            border: `1px solid ${BDR}`, background: "transparent",
            color: DIM, fontFamily: M, fontSize: "0.3rem",
            fontWeight: 700, cursor: busy ? "wait" : "pointer",
            textTransform: "uppercase", letterSpacing: "0.08em",
            whiteSpace: "nowrap",
            opacity: busy ? 0.5 : 1,
          }}>
            {q.label}
          </button>
        ))}
      </div>

      {/* ── Output stream ─────────────────────────────────────────────── */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto",
        padding: "1rem clamp(0.75rem,2.5vw,1.5rem)",
        fontSize: "0.42rem", lineHeight: 1.75,
      }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            color: lineColor(l.kind),
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            marginBottom: l.kind === "report" ? "0.625rem" : "0.15rem",
            paddingLeft: l.kind === "user" ? 0 : (l.kind === "agent" ? "0.75rem" : 0),
            borderLeft: l.kind === "report" ? `2px solid ${G}40` : "none",
            paddingTop: l.kind === "report" ? "0.5rem" : 0,
            paddingBottom: l.kind === "report" ? "0.5rem" : 0,
            paddingRight: l.kind === "report" ? "0.75rem" : 0,
            background: l.kind === "report" ? "rgba(16,185,129,0.03)" : "transparent",
            borderRadius: l.kind === "report" ? 3 : 0,
          }}>
            {l.kind === "user" && <span style={{ color: G, fontWeight: 700 }}>vos&gt; </span>}
            {l.text}
          </div>
        ))}
        {busy && (
          <div style={{ color: A, fontSize: "0.38rem", marginTop: "0.5rem" }}>
            <span style={{ display: "inline-block", animation: "abrx-blink 1s steps(2) infinite" }}>▊</span>
            <span style={{ marginLeft: 6 }}>processing...</span>
          </div>
        )}
      </div>

      {/* ── Command prompt ────────────────────────────────────────────── */}
      <form onSubmit={onSubmit} style={{
        borderTop: `1px solid ${BDR}`, background: "#0A0D13",
        padding: "0.625rem clamp(0.75rem,2.5vw,1.5rem)",
        display: "flex", alignItems: "center", gap: "0.5rem",
        flexShrink: 0,
      }}>
        <span style={{ color: G, fontWeight: 900, fontSize: "0.5rem", letterSpacing: "0.05em" }}>vos&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          placeholder="type a command — try 'help' or 'inspect AAS-1'"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            flex: 1, background: "transparent", border: "none",
            outline: "none", color: W, fontFamily: M,
            fontSize: "0.48rem", padding: "0.25rem 0",
            caretColor: G,
          }}
        />
        <span style={{ fontSize: "0.3rem", color: DIM, whiteSpace: "nowrap" }}>
          ↑↓ history · TAB complete · ENTER run
        </span>
      </form>

      <style jsx>{`
        @keyframes abrx-blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
