// FILE: lib/vos/commands.ts
// All Verification OS commands. Register via commandRegistry.register().
// Add new commands here; the terminal UI does NOT need to change.
import { commandRegistry, wait } from "./commandRegistry";
import type { CommandContext, AssetRecord } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────
function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function bar(n: number, width = 20): string {
  const filled = Math.round((n / 100) * width);
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, width - filled));
}
function requireAsset(ctx: CommandContext, action: string): AssetRecord | undefined {
  if (ctx.args.length === 0) {
    ctx.emit({ kind: "error", text: `Missing asset ID. Syntax: ${action} <asset_id>` });
    ctx.emit({ kind: "out",   text: `Available assets: ${ctx.registry.list().map(a => a.id).join(", ")}` });
    return undefined;
  }
  const a = ctx.registry.get(ctx.args[0]);
  if (!a) {
    ctx.emit({ kind: "error", text: `Asset not found: ${ctx.args[0]}` });
    return undefined;
  }
  return a;
}

// ── HELP ─────────────────────────────────────────────────────────────
commandRegistry.register({
  name: "help", category: "core",
  description: "List available commands and syntax",
  syntax: "help [command]",
  handler: (ctx) => {
    if (ctx.args.length > 0) {
      const cmd = commandRegistry.resolve(ctx.args.join(" "));
      if (!cmd) { ctx.emit({ kind: "error", text: `No such command: ${ctx.args.join(" ")}` }); return; }
      ctx.emit({ kind: "report", text:
        `─── ${cmd.name.toUpperCase()} ───\n` +
        `${cmd.description}\n\n` +
        `Syntax:    ${cmd.syntax}\n` +
        (cmd.example ? `Example:   ${cmd.example}\n` : "") +
        (cmd.aliases?.length ? `Aliases:   ${cmd.aliases.join(", ")}\n` : "") +
        (cmd.future ? `Status:    Reserved for protocol phase 2\n` : "")
      });
      return;
    }
    const all = commandRegistry.all();
    const byCat: Record<string, typeof all> = { core: [], intelligence: [], execution: [], admin: [] };
    all.forEach(c => byCat[c.category].push(c));

    let out = "ABRAXAS VERIFICATION OS — COMMAND INDEX\n\n";
    const cats: Array<keyof typeof byCat> = ["core", "intelligence", "execution", "admin"];
    for (const cat of cats) {
      if (byCat[cat].length === 0) continue;
      out += `── ${cat.toUpperCase()} ──\n`;
      byCat[cat].forEach(c => {
        const flag = c.future ? "  [phase 2]" : "";
        out += `  ${c.name.padEnd(22)} ${c.description}${flag}\n`;
      });
      out += "\n";
    }
    out += "Type 'help <command>' for syntax. Type 'inspect AAS-1' to interrogate the Genesis Asset.";
    ctx.emit({ kind: "report", text: out });
  },
});

// ── STATUS ───────────────────────────────────────────────────────────
commandRegistry.register({
  name: "status", category: "core",
  description: "Show protocol network status and registry health",
  syntax: "status",
  handler: async (ctx) => {
    ctx.emit({ kind: "agent", text: "[Agent] Pinging Solana mainnet..." });
    await wait(140);
    ctx.emit({ kind: "agent", text: "[Agent] Querying verification network..." });
    await wait(120);
    ctx.emit({ kind: "agent", text: "[Agent] Loading registry state..." });
    await wait(100);

    const assets = ctx.registry.list();
    const verified = assets.filter(a => a.verification.status === "VERIFIED").length;
    const eligible = assets.filter(a => a.collateral.financeable).length;
    const totalAum = assets.reduce((s, a) => s + a.collateral.appraisalValue, 0);
    const totalBorrow = assets.reduce((s, a) => s + a.collateral.borrowCapacityUsd, 0);

    ctx.emit({ kind: "report", text:
      `── ABRAXAS PROTOCOL STATUS ──\n\n` +
      `Network:                Solana Mainnet · ONLINE\n` +
      `Verification Standard:  AAS-1 · ACTIVE\n` +
      `Registry Size:          ${assets.length} asset${assets.length === 1 ? "" : "s"}\n` +
      `Verified Assets:        ${verified} / ${assets.length}\n` +
      `Collateral Eligible:    ${eligible} / ${assets.length}\n` +
      `Total Tokenized AUM:    ${fmtUsd(totalAum)}\n` +
      `Borrow Capacity:        ${fmtUsd(totalBorrow)} USDC\n` +
      `Build:                  ABRAXAS OS · 2025.1\n` +
      `Last Sync:              ${new Date().toUTCString()}`
    });
  },
});

// ── LIST ─────────────────────────────────────────────────────────────
commandRegistry.register({
  name: "list", aliases: ["ls", "registry"], category: "core",
  description: "List all assets in the registry",
  syntax: "list [filter]",
  handler: (ctx) => {
    const all = ctx.args.length > 0 ? ctx.registry.search(ctx.args.join(" ")) : ctx.registry.list();
    if (all.length === 0) { ctx.emit({ kind: "out", text: "No matching assets." }); return; }

    let out = `── REGISTRY (${all.length}) ──\n\n`;
    out += "ID".padEnd(10) + "NAME".padEnd(22) + "CLASS".padEnd(28) + "STATUS\n";
    out += "─".repeat(80) + "\n";
    all.forEach(a => {
      out += a.id.padEnd(10) +
             a.name.slice(0, 21).padEnd(22) +
             a.assetClass.slice(0, 27).padEnd(28) +
             a.verification.status + "\n";
    });
    ctx.emit({ kind: "report", text: out });
  },
});

// ── INSPECT ──────────────────────────────────────────────────────────
commandRegistry.register({
  name: "inspect", aliases: ["i"], category: "intelligence",
  description: "Generate full intelligence report on an asset",
  syntax: "inspect <asset_id>",
  example: "inspect AAS-1",
  handler: async (ctx) => {
    const a = requireAsset(ctx, "inspect"); if (!a) return;

    ctx.emit({ kind: "agent", text: `[Agent] Loading asset ${a.id}...` });
    await wait(120);
    ctx.emit({ kind: "agent", text: "[Agent] Loading provenance graph..." });
    await wait(160);
    ctx.emit({ kind: "agent", text: "[Agent] Checking verification records..." });
    await wait(140);
    ctx.emit({ kind: "agent", text: "[Agent] Calculating collateral eligibility..." });
    await wait(140);
    ctx.emit({ kind: "agent", text: "[Agent] Verification complete." });

    const v = a.verification;
    const c = a.collateral;
    const cu = a.custody;

    ctx.emit({ kind: "report", text:
      `── INTELLIGENCE REPORT · ${a.id} ──\n\n` +
      `Asset:                   ${a.name}\n` +
      `Asset Class:             ${a.assetClass}\n` +
      `Jurisdiction:            ${a.jurisdiction}\n` +
      `Owner Entity:            ${a.ownerEntity}\n` +
      `Registered:              ${a.registeredAt.split("T")[0]}\n\n` +
      `── VERIFICATION ──\n` +
      `Status:                  ${v.status}\n` +
      `Standard:                ${v.standard}\n` +
      `Certificate:             ${v.certificateId}\n` +
      `Verifier:                ${v.verifier}\n` +
      `Confidence:              ${v.confidence}%  ${bar(v.confidence)}\n` +
      `Valid Until:             ${v.validUntil.split("T")[0]}\n\n` +
      `── COLLATERAL INTELLIGENCE ──\n` +
      `Collateral Score:        ${c.score} / 100   ${bar(c.score)}\n` +
      `Liquidity Rating:        ${c.liquidityRating}\n` +
      `Fraud Risk:              ${c.fraudRisk} (${c.fraudScore}/100)\n` +
      `Appraised Value:         ${fmtUsd(c.appraisalValue)}\n` +
      `Max LTV:                 ${(c.ltvMax * 100).toFixed(0)}%\n` +
      `Borrow Capacity:         ${fmtUsd(c.borrowCapacityUsd)} USDC\n` +
      `DSCR:                    ${c.dscr.toFixed(2)}x\n` +
      `Insurance:               ${fmtUsd(c.insuranceCoverage)}\n` +
      `Financeable:             ${c.financeable ? "YES" : "NO"}\n\n` +
      `── CUSTODY ──\n` +
      `Custodian:               ${cu.custodian}\n` +
      `Vault Type:              ${cu.vaultType}\n` +
      `Signatories:             ${cu.signatories.filter(s => s.status === "ACTIVE").length}/${cu.signatories.length} active\n` +
      `Last Audit:              ${cu.lastAudit.split("T")[0]}\n\n` +
      `Run 'show provenance ${a.id}' for full event chain.`
    });
  },
});

// ── VERIFY ───────────────────────────────────────────────────────────
commandRegistry.register({
  name: "verify", category: "intelligence",
  description: "Verify on-chain attestation against registry record",
  syntax: "verify <asset_id>",
  example: "verify AAS-1",
  handler: async (ctx) => {
    const a = requireAsset(ctx, "verify"); if (!a) return;
    const v = a.verification;
    ctx.emit({ kind: "agent", text: "[Agent] Fetching anchored transaction..." });
    await wait(160);
    ctx.emit({ kind: "agent", text: "[Agent] Recomputing document hash..." });
    await wait(180);
    ctx.emit({ kind: "agent", text: "[Agent] Cross-checking metadata hash..." });
    await wait(140);
    ctx.emit({ kind: "agent", text: "[Agent] Attestation verified." });
    ctx.emit({ kind: "report", text:
      `── ATTESTATION VERIFICATION · ${a.id} ──\n\n` +
      `Certificate:             ${v.certificateId}\n` +
      `Standard:                ${v.standard}\n` +
      `Status:                  ${v.status} ✓\n` +
      `Confidence:              ${v.confidence}%\n\n` +
      `Document Hash:\n  ${v.documentHash}\n\n` +
      `Metadata Hash:\n  ${v.metadataHash}\n\n` +
      `Anchored Transaction:\n  ${v.anchoredTx}\n\n` +
      `Issued:                  ${v.issuedAt}\n` +
      `Valid Until:             ${v.validUntil}\n` +
      `Issuer:                  ${v.verifier}`
    });
  },
});

// ── SHOW PROVENANCE ──────────────────────────────────────────────────
commandRegistry.register({
  name: "show provenance", aliases: ["provenance", "prov"], category: "intelligence",
  description: "Display the full provenance event chain",
  syntax: "show provenance <asset_id>",
  example: "show provenance AAS-1",
  handler: async (ctx) => {
    const a = requireAsset(ctx, "show provenance"); if (!a) return;
    ctx.emit({ kind: "agent", text: "[Agent] Walking provenance graph..." });
    await wait(160);
    let out = `── PROVENANCE CHAIN · ${a.id} (${a.provenance.length} events) ──\n\n`;
    a.provenance.forEach((e, i) => {
      const mark = e.status === "COMPLETE" ? "✓" : e.status === "PENDING" ? "○" : "✗";
      out += `[${e.date}] ${mark} ${e.event}\n`;
      out += `              actor: ${e.actor}\n`;
      if (e.txHash) out += `              tx:    ${e.txHash.slice(0, 24)}...\n`;
      if (i < a.provenance.length - 1) out += "\n";
    });
    ctx.emit({ kind: "report", text: out });
  },
});

// ── SHOW CUSTODY ─────────────────────────────────────────────────────
commandRegistry.register({
  name: "show custody", aliases: ["custody"], category: "intelligence",
  description: "Display custody and signatory information",
  syntax: "show custody <asset_id>",
  example: "show custody AAS-1",
  handler: async (ctx) => {
    const a = requireAsset(ctx, "show custody"); if (!a) return;
    ctx.emit({ kind: "agent", text: "[Agent] Resolving custody chain..." });
    await wait(140);
    const c = a.custody;
    let out = `── CUSTODY RECORD · ${a.id} ──\n\n`;
    out += `Custodian:               ${c.custodian}\n`;
    out += `Vault Type:              ${c.vaultType}\n`;
    out += `Jurisdiction:            ${c.jurisdiction}\n`;
    out += `Audit Cadence:           ${c.auditCadence}\n`;
    out += `Last Audit:              ${c.lastAudit.split("T")[0]}\n\n`;
    out += `── SIGNATORIES (${c.signatories.length}) ──\n`;
    c.signatories.forEach(s => {
      const mark = s.status === "ACTIVE" ? "●" : "○";
      out += `  ${mark} ${s.id}  ${s.role.padEnd(34)} ${s.hash}\n`;
    });
    ctx.emit({ kind: "report", text: out });
  },
});

// ── SHOW COLLATERAL ──────────────────────────────────────────────────
commandRegistry.register({
  name: "show collateral", aliases: ["collateral"], category: "intelligence",
  description: "Display collateral eligibility breakdown",
  syntax: "show collateral <asset_id>",
  example: "show collateral AAS-1",
  handler: async (ctx) => {
    const a = requireAsset(ctx, "show collateral"); if (!a) return;
    ctx.emit({ kind: "agent", text: "[Agent] Computing collateral capacity..." });
    await wait(140);
    const c = a.collateral;
    let out = `── COLLATERAL ELIGIBILITY · ${a.id} ──\n\n`;
    out += `Status:                  ${c.status}\n`;
    out += `Financeable:             ${c.financeable ? "YES" : "NO"}\n`;
    out += `Collateral Score:        ${c.score}/100   ${bar(c.score)}\n`;
    out += `Liquidity Rating:        ${c.liquidityRating}\n`;
    out += `Max LTV:                 ${(c.ltvMax * 100).toFixed(0)}%\n`;
    out += `Borrow Capacity:         ${fmtUsd(c.borrowCapacityUsd)} USDC\n`;
    out += `DSCR:                    ${c.dscr.toFixed(2)}x\n`;
    out += `Insurance:               ${fmtUsd(c.insuranceCoverage)}\n`;
    out += `Appraisal:               ${fmtUsd(c.appraisalValue)} (${c.appraisalDate})\n\n`;
    out += `── FINANCEABILITY DRIVERS ──\n`;
    c.reasons.forEach((r, i) => out += `  ${(i + 1).toString().padStart(2)}. ${r}\n`);
    ctx.emit({ kind: "report", text: out });
  },
});

// ── SHOW RISK ────────────────────────────────────────────────────────
commandRegistry.register({
  name: "show risk", aliases: ["risk"], category: "intelligence",
  description: "Display risk profile and fraud indicators",
  syntax: "show risk <asset_id>",
  example: "show risk AAS-1",
  handler: async (ctx) => {
    const a = requireAsset(ctx, "show risk"); if (!a) return;
    ctx.emit({ kind: "agent", text: "[Agent] Running risk model..." });
    await wait(160);
    const c = a.collateral;
    const v = a.verification;
    let out = `── RISK PROFILE · ${a.id} ──\n\n`;
    out += `Fraud Risk:              ${c.fraudRisk}\n`;
    out += `Fraud Score:             ${c.fraudScore}/100 (lower = safer)\n`;
    out += `Verification Confidence: ${v.confidence}%\n`;
    out += `Liquidity Rating:        ${c.liquidityRating}\n`;
    out += `Concentration Risk:      Single-asset registry (early stage)\n`;
    out += `Jurisdictional Risk:     ${a.jurisdiction}\n`;
    out += `Custody Risk:            ${a.custody.signatories.filter(s => s.status === "ACTIVE").length}/${a.custody.signatories.length} signatories active\n`;
    out += `Insurance Coverage:      ${fmtUsd(c.insuranceCoverage)}\n`;
    out += `Recommendation:          ${c.financeable ? "APPROVED for collateral" : "REQUIRES REVIEW"}\n`;
    ctx.emit({ kind: "report", text: out });
  },
});

// ── SHOW VALUATION ───────────────────────────────────────────────────
commandRegistry.register({
  name: "show valuation", aliases: ["valuation", "value"], category: "intelligence",
  description: "Display appraisal and valuation history",
  syntax: "show valuation <asset_id>",
  example: "show valuation AAS-1",
  handler: async (ctx) => {
    const a = requireAsset(ctx, "show valuation"); if (!a) return;
    const c = a.collateral;
    ctx.emit({ kind: "agent", text: "[Agent] Loading valuation history..." });
    await wait(140);
    ctx.emit({ kind: "report", text:
      `── VALUATION · ${a.id} ──\n\n` +
      `Appraised Value:         ${fmtUsd(c.appraisalValue)}\n` +
      `Appraisal Date:          ${c.appraisalDate}\n` +
      `Appraiser:               Blue Ridge Highlands Appraisal Group\n` +
      `Methodology:             Income approach + comparable sales\n` +
      `Validity Window:         12 months from appraisal date\n` +
      `Insurance Coverage:      ${fmtUsd(c.insuranceCoverage)}\n` +
      `Loan-to-Value Ceiling:   ${(c.ltvMax * 100).toFixed(0)}%\n`
    });
  },
});

// ── SHOW EVENTS ──────────────────────────────────────────────────────
commandRegistry.register({
  name: "show events", aliases: ["events", "log"], category: "intelligence",
  description: "Display event history for an asset",
  syntax: "show events <asset_id>",
  example: "show events AAS-1",
  handler: (ctx) => {
    const a = requireAsset(ctx, "show events"); if (!a) return;
    let out = `── EVENT LOG · ${a.id} ──\n\n`;
    a.provenance.forEach(e => {
      out += `${e.date}  ${e.status.padEnd(8)} ${e.event}\n`;
    });
    ctx.emit({ kind: "report", text: out });
  },
});

// ── CLEAR ────────────────────────────────────────────────────────────
commandRegistry.register({
  name: "clear", aliases: ["cls"], category: "core",
  description: "Clear the terminal output",
  syntax: "clear",
  handler: () => { /* handled by UI on parse */ },
});

// ── FUTURE COMMANDS (phase 2) ────────────────────────────────────────
const futureSpecs: Array<{ name: string; description: string; syntax: string }> = [
  { name: "attest",     description: "Submit a new attestation to an asset",       syntax: "attest <asset_id> <attestation_type>" },
  { name: "underwrite", description: "Run underwriting model on collateral",        syntax: "underwrite <asset_id>" },
  { name: "finance",    description: "Initiate borrow transaction against asset",   syntax: "finance <asset_id> <amount_usdc>" },
  { name: "vault",      description: "Inspect vault custody parameters",            syntax: "vault <asset_id>" },
  { name: "oracle",     description: "Query oracle feeds for asset valuation",      syntax: "oracle <asset_id>" },
  { name: "audit",      description: "Schedule or trigger an asset audit",          syntax: "audit <asset_id>" },
];
futureSpecs.forEach(spec => commandRegistry.register({
  name: spec.name, category: "execution",
  description: spec.description, syntax: spec.syntax,
  future: true,
  handler: () => { /* future flag handled by registry */ },
}));
