// FILE: app/passport/[id]/page.tsx
// Public "Abraxas Passport". one URL per verified entity.
// Shareable on Twitter, embeds in pitch decks, links from partner sites.
// This is the viral growth surface: every verified user = a marketing moment.
import { createClient }  from "@supabase/supabase-js";
import Link             from "next/link";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G = "#10B981";
const W = "#F8FAFC";
const BDR = "#1C2333";
const CARD = "#0D1117";

interface PassportData {
  id:                 string;
  holder_wallet?:     string;
  jurisdiction?:      string;
  verification_level?: string;
  world_id_verified?: boolean;
  issuance_date?:     string;
  expiration_date?:   string;
  asset_type?:        string;
  asset_value?:       string;
  credential_type:    "identity" | "asset";
}

async function getPassport(id: string): Promise<PassportData | null> {
  if (!SB_URL || !SB_KEY) return null;
  const sb = createClient(SB_URL, SB_KEY);

  // Try identity credential first
  const { data: cred } = await sb
    .from("abraxas_credentials")
    .select("jti, holder_wallet, jurisdiction, verification_level, world_id_verified, issuance_date, expiration_date")
    .eq("jti", `urn:uuid:${id}`)
    .single();
  if (cred) return { ...cred, id, credential_type: "identity" };

  // Try submitted asset
  const { data: asset } = await sb
    .from("submitted_assets")
    .select("id, session_id, asset_type, estimated_value, jurisdiction, lifecycle_state, created_at")
    .eq("local_asset_id", id)
    .single();
  if (asset) return {
    id,
    jurisdiction:       asset.jurisdiction,
    issuance_date:      asset.created_at,
    asset_type:         asset.asset_type,
    asset_value:        asset.estimated_value,
    credential_type:    "asset",
  };

  return null;
}

export default async function PassportPage({ params }: { params: { id: string } }) {
  const data = await getPassport(params.id);

  const BG = "#040608";

  return (
    <div style={{ minHeight:"100vh", background:BG, display:"flex", flexDirection:"column",
                   alignItems:"center", justifyContent:"center", padding:"2rem 1rem",
                   fontFamily:M }}>

      {/* Back link */}
      <div style={{ width:"100%", maxWidth:560, marginBottom:"1rem" }}>
        <Link href="/terminal" style={{ color:G, textDecoration:"none",
                                         fontSize:"0.65rem", fontWeight:700,
                                         letterSpacing:"0.1em", textTransform:"uppercase" }}>
          ← Back to Abraxas
        </Link>
      </div>

      {/* Passport card */}
      <div style={{ width:"100%", maxWidth:560, background:CARD,
                     border:`1px solid ${data ? G+"50" : BDR}`,
                     borderRadius:12, overflow:"hidden",
                     boxShadow: data ? `0 0 60px ${G}20` : "none" }}>

        {/* Header */}
        <div style={{ background:"#030508", padding:"1.25rem 1.5rem",
                       borderBottom:`1px solid ${BDR}` }}>
          <div style={{ fontSize:"0.58rem", fontWeight:700, color:G,
                         letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:6 }}>
            ABRAXAS PROTOCOL · VERIFIED CREDENTIAL
          </div>
          {data ? (
            <div style={{ fontSize:"1.25rem", fontWeight:900, color:W }}>
              {data.credential_type === "identity"
                ? "Identity Credential"
                : `${data.asset_type?.replace(/_/g," ")} Asset Record`}
            </div>
          ) : (
            <div style={{ fontSize:"1rem", fontWeight:700, color:"rgba(255,255,255,0.4)" }}>
              Credential not found
            </div>
          )}
        </div>

        {data ? (
          <div style={{ padding:"1.5rem" }}>
            {/* Verification badge */}
            <div style={{ display:"flex", alignItems:"center", gap:"1rem",
                           marginBottom:"1.5rem", padding:"1rem",
                           background:`${G}08`, border:`1px solid ${G}30`,
                           borderRadius:8 }}>
              <div style={{ width:48, height:48, borderRadius:"50%",
                             border:`2px solid ${G}`, display:"flex",
                             alignItems:"center", justifyContent:"center",
                             background:`${G}15`, flexShrink:0 }}>
                <span style={{ fontSize:"1.25rem" }}>
                  {data.credential_type === "identity" ? "✓" : "◈"}
                </span>
              </div>
              <div>
                <div style={{ fontSize:"0.78rem", fontWeight:900, color:G,
                               textTransform:"uppercase", letterSpacing:"0.08em",
                               marginBottom:2 }}>
                  Verified by Abraxas Protocol
                </div>
                <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.4)" }}>
                  {data.credential_type === "identity"
                    ? `${data.verification_level?.toUpperCase() ?? "STANDARD"} IDENTITY CREDENTIAL`
                    : "ASSET ATTESTATION · V5 VERIFICATION PIPELINE"}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div style={{ display:"grid", gap:"0.25rem", marginBottom:"1.5rem" }}>
              {([
                ["Credential ID",   params.id],
                ["Type",            data.credential_type === "identity" ? "Identity (KYC)" : `RWA · ${data.asset_type?.replace(/_/g," ")}`],
                ["Jurisdiction",    data.jurisdiction ?? "-"],
                ...(data.credential_type === "identity" ? [
                  ["Verification Level", (data.verification_level ?? "standard").toUpperCase()],
                  ["Certified IDV",      "Document + Liveness · Veriff"],
                ] : [
                  ["Asset Value", data.asset_value && data.asset_value !== "Not specified" ? `$${parseInt(data.asset_value.replace(/[^0-9]/g,"") || "0").toLocaleString()}` : "-"],
                ]),
                ["Issued",   data.issuance_date   ? new Date(data.issuance_date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}) : "-"],
                ["Expires",  data.expiration_date ? new Date(data.expiration_date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}) : "-"],
                ["Standard", "W3C Verifiable Credential v2.0"],
                ["Chain",    "Sui (zkLogin)"],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                       padding:"0.5rem 0.75rem",
                                       background:"rgba(255,255,255,0.02)",
                                       borderRadius:4, gap:"0.5rem",
                                       flexWrap:"wrap" }}>
                  <span style={{ fontSize:"0.62rem", color:"rgba(255,255,255,0.35)" }}>{k}</span>
                  <span style={{ fontSize:"0.65rem", fontWeight:700, color:W,
                                  textAlign:"right", wordBreak:"break-all" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Verify this credential */}
            <div style={{ padding:"0.875rem", background:`${G}06`,
                           border:`1px solid ${G}25`, borderRadius:6,
                           marginBottom:"1rem" }}>
              <div style={{ fontSize:"0.58rem", color:G, fontWeight:700,
                             letterSpacing:"0.12em", textTransform:"uppercase",
                             marginBottom:"0.375rem" }}>
                FOR PROTOCOLS. VERIFY THIS CREDENTIAL
              </div>
              <div style={{ fontFamily:"'Courier New',monospace", fontSize:"0.6rem",
                             color:"rgba(255,255,255,0.4)", lineHeight:1.6,
                             wordBreak:"break-all" }}>
                POST https://abraxas-app.vercel.app/api/credentials/verify<br/>
                {"{"} "credential_jti": "{params.id}", "verifier_id": "your-protocol" {"}"}
              </div>
            </div>

            {/* Social share */}
            <div style={{ display:"flex", gap:"0.5rem" }}>
              <a href={`https://twitter.com/intent/tweet?text=Just+verified+on+%40abraxasxyz+%E2%80%94+my+asset+is+now+credentialed+across+every+integrated+protocol.+No+re-KYC.+One+verification.+https%3A%2F%2Fabraxas-app.vercel.app%2Fpassport%2F${params.id}`}
                 target="_blank" rel="noopener noreferrer"
                 style={{ flex:1, display:"block", padding:"0.6rem",
                           borderRadius:5, border:`1px solid ${BDR}`,
                           background:"transparent", color:"rgba(255,255,255,0.4)",
                           fontFamily:M, fontSize:"0.65rem", fontWeight:700,
                           cursor:"pointer", textDecoration:"none",
                           textAlign:"center", letterSpacing:"0.06em",
                           textTransform:"uppercase" }}>
                SHARE ON X →
              </a>
              <Link href="/terminal"
                 style={{ flex:1, display:"block", padding:"0.6rem",
                           borderRadius:5, border:"none",
                           background:G, color:"#000",
                           fontFamily:M, fontSize:"0.65rem", fontWeight:900,
                           cursor:"pointer", textDecoration:"none",
                           textAlign:"center", letterSpacing:"0.06em",
                           textTransform:"uppercase" }}>
                GET YOURS →
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ padding:"2rem", textAlign:"center" }}>
            <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.35)",
                           marginBottom:"1rem" }}>
              No credential found for ID: {params.id}
            </div>
            <Link href="/terminal" style={{ color:G, fontSize:"0.65rem",
                                             textDecoration:"none", fontWeight:700,
                                             textTransform:"uppercase",
                                             letterSpacing:"0.08em" }}>
              ← Back to Terminal
            </Link>
          </div>
        )}
      </div>

      <div style={{ marginTop:"1rem", fontSize:"0.58rem",
                     color:"rgba(255,255,255,0.2)", textAlign:"center" }}>
        Abraxas Protocol · Verification and Identity Layer for Real-World Assets
      </div>
    </div>
  );
}
