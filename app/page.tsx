"use client";
// FILE: app/page.tsx
// Abraxas landing page v2. scroll animations, video section, social login CTA.
// Scroll animations via IntersectionObserver + CSS transitions.

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";
const B = "#3B82F6";
const A = "#F59E0B";
const W = "#F8FAFC";
const BDR = "#1C2333";

// Hook: trigger animation when element enters viewport
function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

interface FadeProps {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}

function Fade({ children, delay = 0, style }: FadeProps) {
  const { ref, visible } = useFadeIn();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

const STEPS = [
  {
    n:"01", color:G,
    title:"Create Your Passport",
    desc:"Sign in with Google or connect your wallet. Abraxas creates your identity profile in seconds. no seed phrases required for new users.",
  },
  {
    n:"02", color:B,
    title:"Verify Once",
    desc:"Complete a single identity verification. Government ID + liveness check through certified providers. Your W3C Verifiable Credential is issued on Solana.",
  },
  {
    n:"03", color:A,
    title:"Tokenize Everything",
    desc:"Submit your asset. real estate, music catalog, minerals, IP, books. Our team runs the V5 verification pipeline. Token minted. Collateral eligible.",
  },
];

const ASSET_TYPES = [
  { label:"Real Estate",         color:G,  icon:"⌂" },
  { label:"Music Royalties",     color:"#8B5CF6", icon:"\u266a" },
  { label:"Wyoming LLC",         color:B,  icon:"\u25a0" },
  { label:"Books & IP",          color:A,  icon:"\u25c6" },
  { label:"Mineral Rights",      color:G,  icon:"\u25c9" },
  { label:"Affordable Housing",  color:B,  icon:"\u25cb" },
];

export default function Home() {
  const [pct, setPct] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPct(p => {
      if (p >= 100) { clearInterval(t); setReady(true); return 100; }
      return Math.min(p + 4, 100);
    }), 22);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background:"#060810", color:W, fontFamily:M, overflowX:"hidden" }}>

      {/* ── HERO ── */}
      <section style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
                          alignItems:"center", justifyContent:"center",
                          padding:"2rem 1rem", textAlign:"center",
                          position:"relative" }}>
        {/* Background grid */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                       backgroundImage:`linear-gradient(rgba(16,185,129,0.04) 1px,transparent 1px),
                                        linear-gradient(90deg,rgba(16,185,129,0.04) 1px,transparent 1px)`,
                       backgroundSize:"60px 60px" }}/>

        {/* Diamond */}
        <div style={{ marginBottom:"1.75rem" }}>
          <svg width={64} height={64} viewBox="0 0 40 40" fill="none">
            <polygon points="20,2 38,20 20,38 2,20"
              stroke={G} strokeWidth="1.5" fill="none"/>
            <polygon points="20,8 32,20 20,32 8,20"
              stroke={G} strokeWidth="1" fill={`${G}12`}/>
            <circle cx="20" cy="20" r="3" fill={G}
              style={{ filter:`drop-shadow(0 0 8px ${G})` }}/>
          </svg>
        </div>

        {/* Wordmark */}
        <div style={{ fontFamily:"Georgia,serif",
                       fontSize:"clamp(3rem,10vw,6rem)",
                       fontWeight:700, letterSpacing:"-0.03em",
                       lineHeight:1, marginBottom:"1rem",
                       background:`linear-gradient(135deg,${W} 60%,${G})`,
                       WebkitBackgroundClip:"text",
                       WebkitTextFillColor:"transparent" }}>
          ABRAXAS
        </div>

        <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.5vw,1.4rem)",
                       color:"rgba(255,255,255,0.6)", lineHeight:1.6,
                       maxWidth:560, margin:"0 auto 2rem" }}>
          The verification and identity layer
          <br />
          for real-world assets onchain.
        </div>

        {/* Protocol stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)",
                       gap:"1px", background:BDR, borderRadius:8,
                       overflow:"hidden", width:"min(360px,90vw)",
                       marginBottom:"2rem", border:`1px solid ${BDR}` }}>
          {[["4","Assets Verified"],["$2.8M+","Value Attested"],["W3C","VC Standard"]].map(([v,l]) => (
            <div key={l} style={{ background:"#0D1117",
                                    padding:"0.875rem 0.5rem", textAlign:"center" }}>
              <div style={{ fontFamily:M, fontSize:"clamp(1.1rem,3vw,1.5rem)",
                             fontWeight:900, color:G, marginBottom:2 }}>{v}</div>
              <div style={{ fontFamily:M, fontSize:"0.5rem",
                             color:"rgba(255,255,255,0.25)",
                             letterSpacing:"0.08em", textTransform:"uppercase" }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Progress + CTAs */}
        <div style={{ width:"min(260px,80vw)", marginBottom:"1.75rem" }}>
          <div style={{ height:2, background:"rgba(255,255,255,0.06)",
                         borderRadius:1, overflow:"hidden" }}>
            <div style={{ height:"100%", background:`linear-gradient(90deg,${G},${B})`,
                           width:`${pct}%`, transition:"width 0.02s linear",
                           borderRadius:1 }}/>
          </div>
          <div style={{ textAlign:"center", marginTop:"0.5rem",
                         fontSize:"0.5rem", color:"rgba(255,255,255,0.2)",
                         letterSpacing:"0.15em", textTransform:"uppercase" }}>
            {ready ? "PROTOCOL READY" : `INITIALIZING · ${pct}%`}
          </div>
        </div>

        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap",
                       justifyContent:"center" }}>
          <Link href="/terminal" style={{
            padding:"0.875rem 2rem", borderRadius:6, border:"none",
            background:G, color:"#000", fontFamily:M,
            fontSize:"0.92rem", fontWeight:900,
            letterSpacing:"0.05em", textTransform:"uppercase",
            textDecoration:"none", display:"inline-block",
            boxShadow:`0 0 24px ${G}40`,
            opacity: ready ? 1 : 0.5,
            pointerEvents: ready ? "auto" : "none",
            transition:"opacity 0.3s",
          }}>
            ENTER PROTOCOL
          </Link>
          <Link href="/dashboard" style={{
            padding:"0.875rem 1.5rem", borderRadius:6,
            border:"1px solid rgba(255,255,255,0.15)",
            background:"transparent", color:"rgba(255,255,255,0.5)",
            fontFamily:M, fontSize:"0.85rem", fontWeight:700,
            letterSpacing:"0.05em", textTransform:"uppercase",
            textDecoration:"none", display:"inline-block",
            opacity: ready ? 1 : 0.3,
            pointerEvents: ready ? "auto" : "none",
            transition:"opacity 0.3s",
          }}>
            DASHBOARD
          </Link>
        </div>

        {/* Scroll indicator */}
        {ready && (
          <div style={{ position:"absolute", bottom:"2rem",
                         display:"flex", flexDirection:"column",
                         alignItems:"center", gap:"0.375rem",
                         animation:"bounce 2s infinite" }}>
            <style>{`
              @keyframes bounce {
                0%,100%{transform:translateY(0)}
                50%{transform:translateY(6px)}
              }
            `}</style>
            <div style={{ fontFamily:M, fontSize:"0.5rem",
                           color:"rgba(255,255,255,0.2)",
                           letterSpacing:"0.15em",
                           textTransform:"uppercase" }}>
              SCROLL
            </div>
            <div style={{ width:1, height:24,
                           background:`linear-gradient(${G},transparent)` }}/>
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding:"5rem 1rem", maxWidth:900, margin:"0 auto" }}>
        <Fade>
          <div style={{ textAlign:"center", marginBottom:"3rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.6rem", color:G,
                           letterSpacing:"0.2em", textTransform:"uppercase",
                           marginBottom:"0.75rem" }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontFamily:"Georgia,serif",
                          fontSize:"clamp(1.75rem,4vw,2.75rem)",
                          fontWeight:700, color:W, lineHeight:1.2,
                          letterSpacing:"-0.02em", margin:0 }}>
              Three steps to verified,<br />
              <span style={{ color:G }}>collateral-eligible assets.</span>
            </h2>
          </div>
        </Fade>

        <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
          {STEPS.map((step, i) => (
            <Fade key={step.n} delay={i * 0.15}>
              <div style={{ display:"flex", gap:"1.5rem", alignItems:"flex-start",
                             padding:"1.5rem", borderRadius:8,
                             background:"rgba(255,255,255,0.02)",
                             border:`1px solid rgba(255,255,255,0.06)`,
                             borderLeft:`3px solid ${step.color}` }}>
                <div style={{ fontFamily:M, fontSize:"2rem", fontWeight:900,
                               color:`${step.color}30`, flexShrink:0,
                               lineHeight:1 }}>
                  {step.n}
                </div>
                <div>
                  <div style={{ fontFamily:S, fontSize:"clamp(1rem,2vw,1.2rem)",
                                 fontWeight:700, color:W, marginBottom:"0.5rem" }}>
                    {step.title}
                  </div>
                  <div style={{ fontFamily:S, fontSize:"0.85rem",
                                 color:"rgba(255,255,255,0.5)", lineHeight:1.7 }}>
                    {step.desc}
                  </div>
                </div>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* ── VIDEO DEMO ── */}
      <section style={{ padding:"5rem 1rem", background:"rgba(16,185,129,0.03)",
                          borderTop:`1px solid ${BDR}`, borderBottom:`1px solid ${BDR}` }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <Fade>
            <div style={{ textAlign:"center", marginBottom:"2rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.6rem", color:G,
                             letterSpacing:"0.2em", textTransform:"uppercase",
                             marginBottom:"0.75rem" }}>
                SEE IT IN ACTION
              </div>
              <h2 style={{ fontFamily:"Georgia,serif",
                            fontSize:"clamp(1.5rem,3.5vw,2.25rem)",
                            fontWeight:700, color:W, lineHeight:1.2, margin:0 }}>
                From submission to verified asset
                <br />
                <span style={{ color:G }}>in under 5 minutes.</span>
              </h2>
            </div>
          </Fade>
          <Fade delay={0.1}>
            <div style={{ position:"relative", borderRadius:10, overflow:"hidden",
                           border:`1px solid ${G}30`,
                           background:"#0A0C10",
                           aspectRatio:"16/9",
                           display:"flex", alignItems:"center",
                           justifyContent:"center" }}>
              {/* Video placeholder. replace src with YouTube embed when ready */}
              <div style={{ textAlign:"center" }}>
                <div style={{ width:72, height:72, borderRadius:"50%",
                               background:`${G}15`, border:`2px solid ${G}30`,
                               display:"flex", alignItems:"center",
                               justifyContent:"center", margin:"0 auto 1rem",
                               cursor:"pointer" }}>
                  <div style={{ width:0, height:0,
                                 borderStyle:"solid",
                                 borderWidth:"14px 0 14px 24px",
                                 borderColor:`transparent transparent transparent ${G}`,
                                 marginLeft:4 }}/>
                </div>
                <div style={{ fontFamily:M, fontSize:"0.65rem",
                               color:"rgba(255,255,255,0.3)",
                               letterSpacing:"0.12em",
                               textTransform:"uppercase" }}>
                  DEMO VIDEO · COMING SOON
                </div>
                <div style={{ fontFamily:S, fontSize:"0.72rem",
                               color:"rgba(255,255,255,0.2)",
                               marginTop:"0.375rem" }}>
                  Subscribe to the Abraxas YouTube channel for updates
                </div>
              </div>
              {/* Corner badges */}
              <div style={{ position:"absolute", top:12, left:12,
                             padding:"0.25rem 0.625rem", borderRadius:4,
                             background:"rgba(0,0,0,0.8)",
                             border:`1px solid ${G}30`,
                             fontFamily:M, fontSize:"0.52rem",
                             color:G, letterSpacing:"0.08em" }}>
                ABRAXAS · PROTOCOL DEMO
              </div>
            </div>
          </Fade>
        </div>
      </section>

      {/* ── ASSET TYPES ── */}
      <section style={{ padding:"5rem 1rem", maxWidth:900, margin:"0 auto" }}>
        <Fade>
          <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.6rem", color:G,
                           letterSpacing:"0.2em", textTransform:"uppercase",
                           marginBottom:"0.75rem" }}>
              SUPPORTED ASSET CLASSES
            </div>
            <h2 style={{ fontFamily:"Georgia,serif",
                          fontSize:"clamp(1.5rem,3.5vw,2.25rem)",
                          fontWeight:700, color:W, lineHeight:1.2, margin:0 }}>
              Any asset. One credential.
            </h2>
          </div>
        </Fade>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
                       gap:"0.75rem" }}>
          {ASSET_TYPES.map((a, i) => (
            <Fade key={a.label} delay={i * 0.07}>
              <div style={{ padding:"1.25rem 1rem", borderRadius:8,
                             background:"rgba(255,255,255,0.02)",
                             border:`1px solid rgba(255,255,255,0.06)`,
                             textAlign:"center",
                             transition:"border-color 0.2s, background 0.2s",
                             cursor:"default" }}>
                <div style={{ fontSize:"1.5rem", marginBottom:"0.5rem",
                               color:a.color }}>{a.icon}</div>
                <div style={{ fontFamily:S, fontSize:"0.75rem",
                               fontWeight:700, color:W,
                               lineHeight:1.3 }}>{a.label}</div>
              </div>
            </Fade>
          ))}
        </div>
      </section>

      {/* ── ZK LOGIN / SOCIAL ONBOARDING ── */}
      <section style={{ padding:"5rem 1rem",
                          background:"rgba(59,130,246,0.03)",
                          borderTop:`1px solid ${BDR}` }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <Fade>
            <div style={{ display:"flex", gap:"2rem", flexWrap:"wrap",
                           alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ flex:1, minWidth:260 }}>
                <div style={{ fontFamily:M, fontSize:"0.6rem", color:B,
                               letterSpacing:"0.2em", textTransform:"uppercase",
                               marginBottom:"0.75rem" }}>
                  COMING SOON · ZK LOGIN
                </div>
                <h2 style={{ fontFamily:"Georgia,serif",
                              fontSize:"clamp(1.5rem,3.5vw,2.25rem)",
                              fontWeight:700, color:W, lineHeight:1.2,
                              margin:"0 0 1rem" }}>
                  Sign in with Google.
                  <br />
                  <span style={{ color:B }}>Wallet created automatically.</span>
                </h2>
                <p style={{ fontFamily:S, fontSize:"0.85rem",
                             color:"rgba(255,255,255,0.5)", lineHeight:1.75,
                             maxWidth:440, margin:0 }}>
                  No MetaMask. No seed phrases. No crypto knowledge required.
                  Sign in with your Google account and Abraxas creates a Solana
                  wallet for you silently. The same ZK Login experience SUI built
. coming to Abraxas for every user who needs it.
                </p>
              </div>
              <div style={{ padding:"1.5rem", borderRadius:10,
                             background:"rgba(59,130,246,0.07)",
                             border:`1px solid ${B}25`,
                             minWidth:240 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.625rem" }}>
                  {[
                    { icon:"G", label:"Continue with Google", color:W, bg:"rgba(255,255,255,0.06)" },
                    { icon:"A", label:"Continue with Apple",  color:W, bg:"rgba(255,255,255,0.06)" },
                    { icon:"W", label:"Connect Wallet",       color:G, bg:`${G}10` },
                  ].map(opt => (
                    <div key={opt.label}
                      style={{ padding:"0.75rem 1rem", borderRadius:6,
                                background:opt.bg,
                                border:`1px solid rgba(255,255,255,0.08)`,
                                display:"flex", alignItems:"center",
                                gap:"0.75rem", cursor:"default",
                                opacity:0.7 }}>
                      <div style={{ width:24, height:24, borderRadius:"50%",
                                     background:"rgba(255,255,255,0.1)",
                                     display:"flex", alignItems:"center",
                                     justifyContent:"center",
                                     fontFamily:M, fontSize:"0.6rem",
                                     color:opt.color, fontWeight:700 }}>
                        {opt.icon}
                      </div>
                      <span style={{ fontFamily:S, fontSize:"0.82rem",
                                      color:opt.color, fontWeight:500 }}>
                        {opt.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily:M, fontSize:"0.5rem",
                               color:"rgba(255,255,255,0.2)",
                               textAlign:"center", marginTop:"0.875rem",
                               letterSpacing:"0.08em" }}>
                  POWERED BY ZK PROOFS · SOLANA MAINNET
                </div>
              </div>
            </div>
          </Fade>
        </div>
      </section>

      {/* ── UNIVERSAL KYC ── */}
      <section style={{ padding:"5rem 1rem", maxWidth:900, margin:"0 auto" }}>
        <Fade>
          <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.6rem", color:A,
                           letterSpacing:"0.2em", textTransform:"uppercase",
                           marginBottom:"0.75rem" }}>
              PROTOCOL VISION
            </div>
            <h2 style={{ fontFamily:"Georgia,serif",
                          fontSize:"clamp(1.5rem,3.5vw,2.25rem)",
                          fontWeight:700, color:W, lineHeight:1.2,
                          margin:"0 0 1rem" }}>
              One passport.
              <br />
              <span style={{ color:A }}>Every blockchain.</span>
            </h2>
            <p style={{ fontFamily:S, fontSize:"0.9rem",
                         color:"rgba(255,255,255,0.5)", lineHeight:1.75,
                         maxWidth:540, margin:"0 auto" }}>
              Abraxas is building the universal identity and verification layer
              that sits between blockchains. Verify once on Abraxas. Present your
              credential to any protocol on any chain. without re-KYC, without
              re-uploading documents, without friction.
            </p>
          </div>
        </Fade>
        <Fade delay={0.1}>
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap",
                         justifyContent:"center" }}>
            {["Solana","Ethereum","SUI","Polygon","Arbitrum","Base"].map((chain, i) => (
              <div key={chain}
                style={{ padding:"0.5rem 1rem", borderRadius:20,
                          background:"rgba(255,255,255,0.03)",
                          border:"1px solid rgba(255,255,255,0.08)",
                          fontFamily:M, fontSize:"0.65rem",
                          color: i === 0 ? G : "rgba(255,255,255,0.35)",
                          fontWeight: i === 0 ? 700 : 400,
                          letterSpacing:"0.06em" }}>
                {i === 0 ? "✓ " : ""}{chain}
              </div>
            ))}
          </div>
        </Fade>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding:"5rem 1rem",
                          borderTop:`1px solid ${BDR}`,
                          textAlign:"center" }}>
        <Fade>
          <div style={{ fontFamily:M, fontSize:"0.6rem", color:G,
                         letterSpacing:"0.2em", textTransform:"uppercase",
                         marginBottom:"1rem" }}>
            READY TO START
          </div>
          <h2 style={{ fontFamily:"Georgia,serif",
                        fontSize:"clamp(1.75rem,5vw,3rem)",
                        fontWeight:700, color:W, lineHeight:1.1,
                        letterSpacing:"-0.02em", margin:"0 0 1.25rem" }}>
            Verify once.
            <br />
            <span style={{ color:G }}>Deploy everywhere.</span>
          </h2>
          <p style={{ fontFamily:S, fontSize:"0.9rem",
                       color:"rgba(255,255,255,0.45)", lineHeight:1.75,
                       maxWidth:460, margin:"0 auto 2rem" }}>
            Join the asset owners, artists, and builders already building
            on the Abraxas Protocol.
          </p>
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap",
                         justifyContent:"center" }}>
            <Link href="/terminal" style={{
              padding:"1rem 2.5rem", borderRadius:6, border:"none",
              background:G, color:"#000", fontFamily:M,
              fontSize:"1rem", fontWeight:900,
              letterSpacing:"0.05em", textTransform:"uppercase",
              textDecoration:"none", display:"inline-block",
              boxShadow:`0 0 28px ${G}50`,
            }}>
              GET STARTED
            </Link>
            <Link href="/identity" style={{
              padding:"1rem 1.75rem", borderRadius:6,
              border:"1px solid rgba(255,255,255,0.15)",
              background:"transparent", color:"rgba(255,255,255,0.5)",
              fontFamily:M, fontSize:"0.9rem", fontWeight:700,
              letterSpacing:"0.05em", textTransform:"uppercase",
              textDecoration:"none", display:"inline-block",
            }}>
              LEARN MORE
            </Link>
          </div>
        </Fade>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:`1px solid ${BDR}`,
                         padding:"1.5rem 1rem",
                         display:"flex", justifyContent:"space-between",
                         alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.52rem",
                       color:"rgba(255,255,255,0.15)",
                       letterSpacing:"0.1em" }}>
          ABRAXAS PROTOCOL · SOLANA MAINNET · BUILD 2026.1
        </div>
        <div style={{ display:"flex", gap:"1rem" }}>
          {[["TERMINAL","/terminal"],["DASHBOARD","/dashboard"],["IDENTITY","/identity"]].map(([l,h]) => (
            <Link key={l} href={h} style={{ fontFamily:M, fontSize:"0.52rem",
                                              color:"rgba(255,255,255,0.2)",
                                              textDecoration:"none",
                                              letterSpacing:"0.08em",
                                              textTransform:"uppercase" }}>
              {l}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
