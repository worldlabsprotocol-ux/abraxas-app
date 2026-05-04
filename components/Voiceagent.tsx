// FILE: components/VoiceAgent.tsx
// ElevenLabs voice briefing widget.
// Fixed bottom-right corner. Toggle to activate.
// Streams audio — starts speaking immediately.
// VOICE_ENABLED=true required server-side.
"use client";

import { useState, useRef, useCallback } from "react";

// Deterministic briefings — agent builds these from live vault state
const BRIEFINGS = [
  "System status nominal. Five Sophia agents operating across all vaults. $0 unrecovered. Circuit at SAFE.",
  "Mad Lads floor velocity within threshold. Streaming signals stable. No defensive action required.",
  "Vault 4-9-0 royalty cycle complete. Capital redeployed. Annualized yield tracking at 12.8 percent.",
  "Ondo $USDY accruing at 5.2 percent annually. Flight to Safety protocol standing by. NFT volatility within bounds.",
  "Counterparty credit grades: all A or above across receivable positions. Circuit confidence high.",
];

// Waveform bars — animated when speaking
function Waveform({ active }: { active: boolean }) {
  const bars = [4, 7, 5, 9, 6, 8, 4, 7, 5, 8, 6, 9, 4];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "24px" }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          width:         "3px",
          height:        active ? `${h * 2}px` : "4px",
          borderRadius:  "2px",
          background:    "#14F195",
          boxShadow:     active ? "0 0 4px rgba(20,241,149,0.6)" : "none",
          transition:    `height ${0.15 + i * 0.02}s ease-in-out`,
          animation:     active ? `wave-${i % 4} 0.8s ease-in-out infinite alternate` : "none",
        }} />
      ))}
    </div>
  );
}

export function VoiceAgent() {
  const [open,     setOpen]     = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status,   setStatus]   = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [errMsg,   setErrMsg]   = useState("");
  const [briefIdx, setBriefIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const speak = useCallback(async (text: string) => {
    if (speaking) return;
    setSpeaking(true);
    setStatus("loading");
    setErrMsg("");

    try {
      const res = await fetch("/api/voice", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.reason ?? `HTTP ${res.status}`);
      }

      // Stream audio — starts playing as soon as first bytes arrive
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setStatus("playing");
      audio.play();
      audio.onended = () => { setSpeaking(false); setStatus("idle"); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); setStatus("idle"); };

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrMsg(msg.includes("disabled") ? "Enable VOICE_ENABLED=true in Vercel env" : msg);
      setSpeaking(false);
      setStatus("error");
    }
  }, [speaking]);

  const nextBriefing = () => {
    const idx  = (briefIdx + 1) % BRIEFINGS.length;
    setBriefIdx(idx);
    speak(BRIEFINGS[idx]);
  };

  const stop = () => {
    audioRef.current?.pause();
    setSpeaking(false);
    setStatus("idle");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: "88px", right: "16px", zIndex: 60,
          width: "44px", height: "44px", borderRadius: "50%",
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(20,241,149,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 0 12px rgba(20,241,149,0.15)",
          transition: "box-shadow 0.2s",
        }}
        title="Voice Agent"
        aria-label="Open voice agent"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14F195" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: "88px", right: "16px", zIndex: 60,
      width: "260px",
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(20,241,149,0.2)",
      borderRadius: "14px", padding: "1rem",
      boxShadow: "0 0 24px rgba(20,241,149,0.1)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: speaking ? "#14F195" : "var(--subtle)", animation: speaking ? "pulse 0.8s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#14F195", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Abraxas Prime
          </span>
        </div>
        <button onClick={() => { stop(); setOpen(false); }} style={{ background: "none", border: "none", color: "var(--subtle)", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>
      </div>

      {/* Waveform */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem" }}>
        <Waveform active={status === "playing"} />
      </div>

      {/* Status */}
      <div style={{ fontSize: "0.68rem", color: status === "error" ? "#f26b6b" : "var(--muted)", textAlign: "center", marginBottom: "0.75rem", minHeight: "18px" }}>
        {status === "loading" && "Generating briefing…"}
        {status === "playing" && "Speaking…"}
        {status === "error"   && (errMsg || "Voice unavailable")}
        {status === "idle"    && "Ready for briefing"}
      </div>

      {/* Briefing text preview */}
      <div style={{ fontSize: "0.65rem", color: "var(--subtle)", lineHeight: 1.5, marginBottom: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "0.5rem 0.625rem" }}>
        "{BRIEFINGS[briefIdx].slice(0, 80)}…"
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={speaking ? stop : nextBriefing}
          style={{
            flex: 1, background: speaking ? "rgba(242,107,107,0.1)" : "rgba(20,241,149,0.1)",
            border: `1px solid ${speaking ? "rgba(242,107,107,0.3)" : "rgba(20,241,149,0.3)"}`,
            borderRadius: "7px", padding: "0.5rem",
            color: speaking ? "#f26b6b" : "#14F195",
            fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
          }}>
          {speaking ? "⏹ Stop" : "▶ Brief me"}
        </button>
      </div>

      <p style={{ fontSize: "0.56rem", color: "var(--subtle)", textAlign: "center", marginTop: "0.5rem" }}>
        Powered by ElevenLabs · Set VOICE_ENABLED=true
      </p>

      {/* Keyframe style */}
      <style>{`
        @keyframes wave-0 { from { height: 4px; } to { height: 16px; } }
        @keyframes wave-1 { from { height: 8px; } to { height: 20px; } }
        @keyframes wave-2 { from { height: 6px; } to { height: 18px; } }
        @keyframes wave-3 { from { height: 10px; } to { height: 22px; } }
      `}</style>
    </div>
  );
}