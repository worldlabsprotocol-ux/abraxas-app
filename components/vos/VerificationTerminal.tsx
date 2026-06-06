// FILE: components/vos/VerificationTerminal.tsx
// Abraxas Verification OS — Bloomberg-style command terminal.
// UNCONTROLLED input: zero React re-renders on keystrokes, keyboard stays open on mobile.
"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { commandRegistry } from "@/lib/vos/commandRegistry";
import { assetRegistry }   from "@/lib/vos/assetRegistry";
import "@/lib/vos/commands";
import type { LogLine } from "@/lib/vos/types";

const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const BG  = "#06090E";
const BDR = "#1C2333";
const G   = "#10B981";
const A   = "#F59E0B";
const B   = "#3B82F6";
const R   = "#EF4444";
const W   = "#F8FAFC";
const DIM = "rgba(255,255,255,0.4)";

const BANNER = [
  "ABRAXAS VERIFICATION OS  ·  Build 2025.1  ·  Solana Mainnet",
  "─────────────────────────────────────────────────────────────",
  "Type 'help' for all commands.  Try: inspect AAS-1  ·  my assets  ·  demo",
].join("\n");

const QUICK: { label: string; cmd: string }[] = [
  { label: "help",          cmd: "help"         },
  { label: "inspect AAS-1", cmd: "inspect AAS-1"},
  { label: "oracle AAS-1",  cmd: "oracle AAS-1" },
  { label: "my assets",     cmd: "my assets"    },
  { label: "queue",         cmd: "queue"        },
  { label: "session",       cmd: "session"      },
];

function lineColor(k: LogLine["kind"]) {
  if (k === "error")  return R;
  if (k === "agent")  return DIM;
  if (k === "data")   return B;
  if (k === "report") return W;
  if (k === "user")   return W;
  return "rgba(255,255,255,0.75)";
}

// ── InputBar — uncontrolled so Android/iOS keyboard never dismisses ──────────
interface InputBarProps { onSubmit(v: string): void; busy: boolean; history: string[]; }

const InputBar = memo(function InputBar({ onSubmit, busy, history }: InputBarProps) {
  const ref  = useRef<HTMLInputElement>(null);
  const hIdx = useRef(-1);

  useEffect(() => { if (!busy) ref.current?.focus(); }, [busy]);

  const submit = useCallback(() => {
    const v = ref.current?.value ?? "";
    if (busy || !v.trim()) return;
    onSubmit(v);
    if (ref.current) ref.current.value = "";
    hIdx.current = -1;
    requestAnimationFrame(() => ref.current?.focus());
    setTimeout(() => ref.current?.focus(), 50);
  }, [busy, onSubmit]);

  const onKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const n = hIdx.current < 0 ? history.length - 1 : Math.max(0, hIdx.current - 1);
      hIdx.current = n;
      if (ref.current) ref.current.value = history[n];
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx.current < 0) return;
      const n = hIdx.current + 1;
      if (n >= history.length) { hIdx.current = -1; if (ref.current) ref.current.value = ""; }
      else { hIdx.current = n; if (ref.current) ref.current.value = history[n]; }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const cur = (ref.current?.value ?? "").toLowerCase();
      const match = commandRegistry.all().find(c => c.name.startsWith(cur) && !c.future);
      if (match && ref.current) ref.current.value = match.name + " ";
    }
  }, [history, submit]);

  return (
    <div style={{
      borderTop: `1px solid ${BDR}`, background: "#050810",
      padding: "0.75rem 1rem", display: "flex", alignItems: "center",
      gap: "0.625rem", flexShrink: 0,
      position: "sticky", bottom: 0, zIndex: 10,
    }}>
      <span style={{ color: G, fontWeight: 900, fontSize: "1rem",
                      letterSpacing: "0.04em", flexShrink: 0 }}>vos&gt;</span>
      <input
        ref={ref}
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
          color: W, fontFamily: M, fontSize: "16px",
          caretColor: G, padding: "0.25rem 0",
        }}
      />
      <button onClick={submit} disabled={busy} aria-label="Run command" style={{
        padding: "0.5rem 1rem", borderRadius: 4, flexShrink: 0,
        border: `1px solid ${G}`, background: `${G}20`,
        color: G, fontFamily: M, fontSize: "0.875rem", fontWeight: 900,
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.4 : 1,
        letterSpacing: "0.06em",
      }}>RUN</button>
    </div>
  );
});

// ── Main terminal ─────────────────────────────────────────────────────────────
export function VerificationTerminal() {
  const [lines,   setLines]   = useState<LogLine[]>([
    { kind: "report", text: BANNER, ts: Date.now() },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [busy,    setBusy]    = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Inject blink keyframe once — avoids <style jsx global> which breaks App Router
  useEffect(() => {
    const id = "abraxas-blink-style";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.textContent = "@keyframes abraxas-blink{50%{opacity:0}}";
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const emit = useCallback((line: Omit<LogLine, "ts">) => {
    setLines(prev => [...prev, { ...line, ts: Date.now() }]);
  }, []);

  const run = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === "clear" || trimmed.toLowerCase() === "cls") {
      setLines([{ kind: "report", text: BANNER, ts: Date.now() }]);
      setHistory(h => [...h, trimmed]);
      return;
    }
    emit({ kind: "user", text: trimmed });
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
      background: BG, height: "100%",
      display: "flex", flexDirection: "column",
      fontFamily: M, color: W, overflow: "hidden", minHeight: 0,
    }}>
      {/* Top bar — status */}
      <div style={{
        background: "#030508", borderBottom: `1px solid ${BDR}`,
        padding: "0.4rem 1rem",
        display: "flex", alignItems: "center", gap: "1.25rem",
        fontSize: "0.7rem", color: DIM, flexShrink: 0, overflowX: "auto",
      }}>
        <span style={{ color: G, fontWeight: 700 }}>● VOS ONLINE</span>
        <span>SOLANA MAINNET</span>
        <span style={{ color: A }}>REGISTRY: {assetRegistry.list().length} ASSETS</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: "rgba(255,255,255,0.2)" }}>
          {new Date().toISOString().split("T")[0]}
        </span>
      </div>

      {/* Quick-command pills */}
      <div style={{
        background: "#08090F", borderBottom: `1px solid ${BDR}`,
        padding: "0.5rem 1rem",
        display: "flex", gap: "0.5rem", flexWrap: "nowrap",
        overflowX: "auto", flexShrink: 0,
      }}>
        {QUICK.map(q => (
          <button key={q.cmd} onClick={() => run(q.cmd)} disabled={busy} style={{
            padding: "0.4rem 0.875rem", borderRadius: 4, flexShrink: 0,
            border: `1px solid ${G}35`, background: `${G}08`,
            color: G, fontFamily: M, fontSize: "0.8rem",
            fontWeight: 700, cursor: busy ? "not-allowed" : "pointer",
            textTransform: "uppercase", letterSpacing: "0.07em",
            opacity: busy ? 0.5 : 1, whiteSpace: "nowrap",
          }}>
            {q.label}
          </button>
        ))}
      </div>

      {/* Output stream */}
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "0.875rem 1rem",
        fontSize: "0.875rem", lineHeight: 1.75,
      }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            color: lineColor(l.kind),
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            marginBottom: l.kind === "report" ? "0.75rem" : "0.125rem",
            paddingLeft: l.kind === "agent" ? "1rem" : 0,
            borderLeft: l.kind === "report" ? `2px solid ${G}35` : "none",
            paddingTop:    l.kind === "report" ? "0.625rem" : 0,
            paddingBottom: l.kind === "report" ? "0.625rem" : 0,
            paddingRight:  l.kind === "report" ? "0.75rem"  : 0,
            background: l.kind === "report" ? `${G}04` : "transparent",
            borderRadius: l.kind === "report" ? 4 : 0,
          }}>
            {l.kind === "user" && (
              <span style={{ color: G, fontWeight: 700, marginRight: "0.4rem" }}>vos&gt;</span>
            )}
            {l.text}
          </div>
        ))}
        {busy && (
          <div style={{ color: A, fontSize: "0.875rem", marginTop: "0.5rem",
                         display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ animation: "abraxas-blink 1s steps(2) infinite" }}>▊</span>
            <span>processing…</span>
          </div>
        )}
      </div>

      <InputBar onSubmit={run} busy={busy} history={history} />
    </div>
  );
}
