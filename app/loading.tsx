// FILE: app/loading.tsx
// Full-page loading screen shown by Next.js App Router before page hydrates.
// Animated sovereign terminal boot sequence.
export default function Loading() {
    return (
      <div style={{
        position:"fixed", inset:0, background:"#000000",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        zIndex:9999, fontFamily:"'JetBrains Mono',monospace",
      }}>
        <style>{`
          @keyframes orbit {
            from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
            to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
          }
          @keyframes fadeSeq {
            0%,100%{ opacity:0.1 } 50%{ opacity:1 }
          }
          @keyframes expandBar {
            from{ width:0 } to{ width:100% }
          }
          @keyframes fadeIn {
            from{ opacity:0; transform:translateY(6px) }
            to  { opacity:1; transform:translateY(0) }
          }
          .boot-line { animation: fadeIn 0.4s ease-out both; }
          .boot-line:nth-child(1){ animation-delay:0.1s }
          .boot-line:nth-child(2){ animation-delay:0.4s }
          .boot-line:nth-child(3){ animation-delay:0.7s }
          .boot-line:nth-child(4){ animation-delay:1.0s }
          .boot-line:nth-child(5){ animation-delay:1.3s }
        `}</style>
  
        {/* Orb */}
        <div style={{ position:"relative", width:"64px", height:"64px", marginBottom:"2rem" }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"1px solid rgba(200,169,110,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:"14px", height:"14px", borderRadius:"50%", background:"#C8A96E", boxShadow:"0 0 20px rgba(200,169,110,0.9)" }} />
          </div>
          {/* Orbiting dot */}
          <div style={{ position:"absolute", top:"50%", left:"50%", marginTop:"-3px", marginLeft:"-3px", width:"6px", height:"6px", borderRadius:"50%", background:"#14F195", animation:"orbit 1.4s linear infinite", boxShadow:"0 0 8px rgba(20,241,149,0.8)" }} />
        </div>
  
        {/* Logo */}
        <div style={{ fontSize:"1.1rem", fontWeight:900, letterSpacing:"0.25em", color:"#C8A96E", textTransform:"uppercase", marginBottom:"1.75rem" }}>
          Abraxas
        </div>
  
        {/* Boot sequence */}
        <div style={{ width:"min(320px,80vw)", display:"flex", flexDirection:"column", gap:"0.35rem", marginBottom:"1.5rem" }}>
          {[
            ["#14F195",  "Solana mainnet connected"],
            ["#6b8cff",  "Circuit engine armed"],
            ["#C8A96E",  "Sophia agents online"],
            ["#FBBF24",  "RWA vault state loaded"],
            ["#a855f7",  "Arena initialized"],
          ].map(([color, text], i) => (
            <div key={i} className="boot-line" style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:color, flexShrink:0, boxShadow:`0 0 6px ${color}` }} />
              <span style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.45)", letterSpacing:"0.05em" }}>{text}</span>
              <span style={{ marginLeft:"auto", fontSize:"0.48rem", color:color, fontWeight:700 }}>OK</span>
            </div>
          ))}
        </div>
  
        {/* Progress bar */}
        <div style={{ width:"min(280px,70vw)", height:"2px", background:"rgba(255,255,255,0.06)", borderRadius:"1px", overflow:"hidden" }}>
          <div style={{ height:"100%", background:"linear-gradient(90deg,#C8A96E,#a855f7,#14F195)", animation:"expandBar 1.6s ease-in-out forwards", borderRadius:"1px" }} />
        </div>
  
        <div style={{ marginTop:"0.875rem", fontSize:"0.44rem", color:"rgba(255,255,255,0.18)", letterSpacing:"0.12em", textTransform:"uppercase" }}>
          World Labs Protocol · Solana
        </div>
      </div>
    );
  }