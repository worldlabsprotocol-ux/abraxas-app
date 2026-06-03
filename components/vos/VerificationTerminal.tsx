// FILE: components/vos/VerificationTerminal.tsx
// Bloomberg/Palantir-style verification terminal.
// Architecture:
//   - InputBar is a memoized child — its focus survives parent re-renders.
//   - All command execution goes through commandRegistry.
//   - Output is a controlled stream; input state lives inside InputBar.
"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
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

Type 'help' to begin. Try: inspect AAS-1 · my assets · status
`.trim();

interface Suggestion { label: string; cmd: string; }
const QUICK_COMMANDS: Suggestion[] = [
  { label: "STATUS",           cmd: "status" },
  { label: "LIST",             cmd: "list" },
  { label: "INSPECT AAS-1",    cmd: "inspect AAS-1" },
  { label: "VERIFY AAS-1",     cmd: "verify AAS-1" },
  { label: "PROVENANCE",       cmd: "show provenance AAS-1" },
  { label: "MY ASSETS",        cmd: "my assets" },
  { label: "SESSION",          cmd: "session" },
  { label: "HELP",             cmd: "help" },
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

// ── Isolated input bar (memoized — survives parent re-renders) ───────
interface InputBarProps {
  onSubmit: (raw: string) => void;
  busy: boolean;
  history: string[];
}
const InputBar = memo(function InputBar({ onSubmit, busy, history }: InputBarProps) {
  // Input state is LOCAL to this component so parent re-renders don't reset it.
  const [value, setValue] = useState("");
  const [hIdx,  setHIdx]  = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refocus after submit so mobile keyboard stays open
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    if (busy || !value.trim()) return;
    onSubmit(value);
    setValue("");
    setHIdx(-1);
    // Refocus immediately — prevents keyboard dismiss on mobile
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(next);
      setValue(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx < 0) return;
      const next = hIdx + 1;
      if (next >= history.length) { setHIdx(-1); setValue(""); }
      else { setHIdx(next); setValue(history[next]); }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const all = commandRegistry.all();
      const match = all.find(c => c.name.startsWith(value.toLowerCase()) && !c.future);
      if (match) setValue(match.name + " ");
    }
  };

  return (
    <div style={{
      borderTop: `1px solid ${BDR}`, background: "#0A0D13",
      padding: "0.625rem clamp(0.75rem,2.5vw,1.5rem)",
      display: "flex", alignItems: "center", gap: "0.5rem",
      flexShrink: 0,
    }}>
      <span style={{ color: G, fontWeight: 900, fontSize: "0.5rem", letterSpacing: "0.05em" }}>vos&gt;</span>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy}
        placeholder="type a command — try 'help', 'inspect AAS-1', 'my assets'"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          flex: 1, background: "transparent", border: "none",
          outline: "none", color: W, fontFamily: M,
          fontSize: "16px", padding: "0.25rem 0",
          caretColor: G, minWidth: 0,
        }}
      />
      <span style={{ fontSize: "0.3rem", color: DIM,
                      whiteSpace: "nowrap", display: "none" }}
            className="vos-hint-desktop">
        ↑↓ history · TAB complete · ENTER run
      </span>
    </div>
  );
});

// ── Main terminal ────────────────────────────────────────────────────
export function VerificationTerminal() {
  const [lines,   setLines]   = useState<LogLine[]>([
    { kind: "report", text: BANNER, ts: Date.now() },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [busy,    setBusy]    = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Autoscroll on new lines
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const emit = useCallback((line: Omit<LogLine, "ts">) => {
    setLines(prev => [...prev, { ...line, ts: Date.now() }]);
  }, []);

  // Stable reference — passed to memoized InputBar
  const run = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === "clear" || trimmed.toLowerCase() === "cls") {
      setLines([{ kind: "report", text: BANNER, ts: Date.now() }]);
      setHistory(h => [...h, trimmed]);
      return;
    }

    setBusy(true);
    setHistory(h => [...h, trimmed]);
    try {
      await commandRegistry.execute(trimmed, assetRegistry, emit, history);
    } finally {
      setBusy(false);
    }
  }, [emit, history]);

  return (
    <div style={{
      background: BG, height: "100%", display: "flex", flexDirection: "column",
      fontFamily: M, color: W, overflow: "hidden",
    }}>
      {/* Banner row */}
      <div style={{
        background: "#040608", borderBottom: `1px solid ${BDR}`,
        padding: "0.5rem clamp(0.75rem,2.5vw,1.5rem)",
        display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
        fontSize: "0.36rem", color: DIM, flexShrink: 0,
      }}>
        <span style={{ color: G, fontWeight: 700 }}>● VOS-1 ONLINE</span>
        <span>NODE: SOLANA-MAINNET</span>
        <span>PROTOCOL: AAS-1</span>
        <span style={{ color: A }}>REGISTRY: {assetRegistry.list().length} ASSETS</span>
        <span style={{ flex: 1 }} />
        <span>{new Date().toISOString().split("T")[0]}</span>
      </div>

      {/* Quick command bar */}
      <div style={{
        background: CARD, borderBottom: `1px solid ${BDR}`,
        padding: "0.5rem clamp(0.75rem,2.5vw,1.5rem)",
        display: "flex", gap: "0.375rem", flexWrap: "wrap",
        overflowX: "auto", flexShrink: 0,
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

      {/* Output stream — scrolls independently */}
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0, overflowY: "auto",
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

      {/* Input — isolated, focus-stable */}
      <InputBar onSubmit={run} busy={busy} history={history} />

      <style jsx global>{`
        @keyframes abrx-blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
