// FILE: app/auth/verify/page.tsx
// Shown after email magic-link is sent.
export default function VerifyPage() {
  const MONO = "'JetBrains Mono',monospace";
  return (
    <div style={{
      minHeight:"100vh", background:"#060810",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:"1rem" }}>
        <div style={{ fontSize:"2rem", marginBottom:"1rem" }}>✉</div>
        <h1 style={{ fontWeight:900, fontSize:"1.4rem", color:"#f0f0f0",
                     fontFamily:MONO, marginBottom:"0.75rem" }}>
          Check your email
        </h1>
        <p style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.35)",
                    lineHeight:1.75 }}>
          A sign-in link has been sent to your email address.
          Click it to access your Abraxas account. The link expires in 24 hours.
        </p>
      </div>
    </div>
  );
}
