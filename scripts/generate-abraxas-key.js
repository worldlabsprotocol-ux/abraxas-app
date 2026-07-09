// FILE: scripts/generate-abraxas-key.js
// Generates Ed25519 signing key pair for Abraxas ID credentials.
// Uses jose (already in your node_modules) — works on Node 16+.
//
// Run once: node scripts/generate-abraxas-key.js
// Then paste output into Vercel env vars.

const path = require("path");
// Use jose from node_modules
const josePath = path.join(__dirname, "..", "node_modules", "jose", "dist", "node", "cjs");

async function main() {
  let generateKeyPair, exportJWK;
  try {
    const jose = require(josePath);
    generateKeyPair = jose.generateKeyPair;
    exportJWK       = jose.exportJWK;
  } catch {
    // Fallback: jose might be at different path
    try {
      const jose = require("jose");
      generateKeyPair = jose.generateKeyPair;
      exportJWK       = jose.exportJWK;
    } catch {
      console.error("jose not found. Run: npm install jose");
      process.exit(1);
    }
  }

  const { privateKey, publicKey } = await generateKeyPair("EdDSA", {
    crv: "Ed25519",
    extractable: true,
  });
  const priv = await exportJWK(privateKey);
  const pub  = await exportJWK(publicKey);

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  ABRAXAS SIGNING KEY PAIR — GENERATED                ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");
  console.log("Add these to Vercel → Settings → Environment Variables\n");
  console.log("─── ABRAXAS_SIGNING_KEY (keep SECRET — server only) ───");
  console.log(JSON.stringify(priv));
  console.log("\n─── ABRAXAS_PUBLIC_KEY (safe to publish) ───");
  console.log(JSON.stringify(pub));
  console.log("\n─── ABRAXAS_ISSUER_URL ───");
  console.log("https://abraxas-app.vercel.app");
  console.log("\n─── SUPABASE_SERVICE_ROLE_KEY ───");
  console.log("(get from supabase.com → project → Settings → API → service_role)");
  console.log("\n✓ Done. Never commit ABRAXAS_SIGNING_KEY to git.\n");
}

main().catch(err => { console.error(err); process.exit(1); });
