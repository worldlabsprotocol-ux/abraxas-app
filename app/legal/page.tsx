export const metadata = { title: "Legal Overview. Abraxas" };

export default function LegalPage() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Legal</p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "2.25rem", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>Legal Overview</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7 }}>
          How Abraxas handles the relationship between off-chain assets and their on-chain representations. For asset originators evaluating whether to commit real assets. this is the page that answers the legal structure question.
        </p>
        <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.2)", borderRadius: "8px" }}>
          <p style={{ fontSize: "0.72rem", color: "#f26b6b", lineHeight: 1.55 }}>
            <strong>Beta disclaimer:</strong> Abraxas is in beta. The legal structures described below represent the intended operational framework. Not all structures are fully executed. We recommend consulting independent legal counsel before committing assets. This is not legal advice.
          </p>
        </div>
      </div>

      {[
        {
          assetClass: "Music & IP Royalties",
          structure: "Royalty Assignment Agreement",
          description: "When an artist or rights holder registers a music catalog, Abraxas operates under a limited royalty assignment. a standard music industry instrument that assigns collection rights for a defined period without transferring ownership of the underlying masters or publishing.",
          ownership: "Artist or label retains full ownership of masters and publishing. Abraxas holds collection rights only during the operating period.",
          enforcement: "Royalty assignment is governed by applicable music licensing law. PRO registrations (ASCAP, BMI, SESAC, SoundExchange) remain with the original rights holder. Abraxas cannot block or redirect payments outside the platform.",
          jurisdiction: "United States (primary). Registration through DistroKid, UnitedMasters, or direct PRO affiliation.",
          tokenRole: "Token-2022 position token represents the vault position share. It is not a security and does not convey ownership of the underlying catalog.",
          status: "Framework defined. SPV formation in progress. Current beta vaults operate under informal royalty assignment pending full legal structure.",
        },
        {
          assetClass: "Real Estate",
          structure: "Fractional Lease Assignment or SPV",
          description: "For income-producing real estate (rental properties), Abraxas operates under a lease assignment that directs rental income to the vault during the operating period. For larger CRE positions, an SPV structure holds the property management agreement.",
          ownership: "Property owner retains full title. Abraxas holds income assignment rights only.",
          enforcement: "Lease assignment recorded with property management company. Income flows directly from tenant or property manager to vault wallet via ACH or stablecoin bridge.",
          jurisdiction: "State-specific. Depends on property location.",
          tokenRole: "Token-2022 position represents vault share backed by rental income stream. Not a security. Not a deed or equity interest.",
          status: "Framework defined. Current VAULT-492 (Real Estate) operates in simulation. Live income assignment pending beta graduation.",
        },
        {
          assetClass: "Receivables & Invoices",
          structure: "Invoice Factoring Agreement",
          description: "Receivables vaults operate under a standard invoice factoring structure. a well-established commercial finance instrument where outstanding invoices are assigned to the platform in exchange for immediate liquidity.",
          ownership: "Invoice originator receives advance payment. Abraxas collects against the invoice. Upon settlement, Abraxas retains the factoring spread.",
          enforcement: "UCC Article 9 security interest filed against assigned receivables. Standard commercial enforcement path.",
          jurisdiction: "United States (UCC). Cross-border receivables handled case by case.",
          tokenRole: "Token-2022 position represents the vault's factoring pool share. Not a security.",
          status: "Framework defined. Current VAULT-493 (Receivables) operates in simulation pending beta graduation.",
        },
        {
          assetClass: "Voice & AI IP",
          structure: "Voice Licensing Agreement",
          description: "Voice IP vaults operate under a licensing agreement that assigns collection rights for AI-generated voice royalties from platforms like ElevenLabs Voice Library. The agreement directs monthly payouts to the vault wallet.",
          ownership: "Voice actor or creator retains full rights to their voice and any cloned model. Licensing agreement is non-exclusive.",
          enforcement: "Platform-level: ElevenLabs payment routing to designated wallet. Agreement between creator and Abraxas.",
          jurisdiction: "Determined by creator's jurisdiction and ElevenLabs Terms of Service.",
          tokenRole: "Token-2022 position represents the vault's voice IP royalty pool share.",
          status: "New asset class. Legal framework in development. Not yet in active beta vaults.",
        },
      ].map((item) => (
        <div key={item.assetClass} style={{ marginBottom: "2.5rem", paddingBottom: "2.5rem", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem" }}>{item.assetClass}</h2>
            <span style={{ fontSize: "0.65rem", color: "var(--gold)", border: "1px solid rgba(200,169,110,0.3)", padding: "0.12rem 0.45rem", borderRadius: "4px" }}>{item.structure}</span>
            <span style={{ fontSize: "0.62rem", color: item.status.includes("simulation") ? "#f0d98a" : item.status.includes("development") ? "var(--subtle)" : "var(--green)", background: item.status.includes("simulation") ? "rgba(240,217,138,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${item.status.includes("simulation") ? "rgba(240,217,138,0.2)" : "rgba(255,255,255,0.08)"}`, padding: "0.12rem 0.45rem", borderRadius: "4px" }}>
              {item.status.includes("in progress") ? "SPV in progress" : item.status.includes("simulation") ? "Simulation. live pending graduation" : item.status.includes("development") ? "Framework in development" : "Active"}
            </span>
          </div>
          {[
            { k: "Structure",    v: item.structure    },
            { k: "Description",  v: item.description  },
            { k: "Ownership",    v: item.ownership    },
            { k: "Enforcement",  v: item.enforcement  },
            { k: "Jurisdiction", v: item.jurisdiction },
            { k: "Token role",   v: item.tokenRole    },
          ].map((row) => (
            <div key={row.k} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: "1px" }}>{row.k}</span>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.65 }}>{row.v}</p>
            </div>
          ))}
        </div>
      ))}

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.25rem 1.5rem" }}>
        <p style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.5rem" }}>For asset originators considering engagement</p>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.7 }}>
          If you represent a label, CRE owner, factoring desk, or other institutional asset originator and want to discuss the legal structure in detail before committing assets. reach out directly. We will provide the full legal framework documentation, current SPV status, and jurisdiction-specific analysis for your asset class.
        </p>
        <a href="https://twitter.com/pabloretroworld" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", marginTop: "0.875rem", fontSize: "0.78rem", color: "var(--gold)", textDecoration: "none" }}>
          Contact: @pabloretroworld on X ↗
        </a>
      </div>
    </div>
  );
}