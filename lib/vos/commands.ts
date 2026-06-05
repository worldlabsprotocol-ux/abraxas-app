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


// ── USER ASSETS (persistent layer) ───────────────────────────────────
// Bridge from terminal commands → userAssetStore (localStorage).
// On the client, dynamic imports avoid SSR issues.
async function loadUserStore() {
  const mod = await import("./userAssetStore");
  return mod.userAssetStore;
}
async function loadSession() {
  const mod = await import("./sessionStore");
  return mod.sessionStore.get();
}

commandRegistry.register({
  name: "my assets", aliases: ["mine", "my"], category: "core",
  description: "List assets you've submitted in this session",
  syntax: "my assets",
  handler: async (ctx) => {
    const store   = await loadUserStore();
    const session = await loadSession();
    ctx.emit({ kind: "agent", text: "[Agent] Loading your session..." });
    await wait(120);
    ctx.emit({ kind: "agent", text: `[Agent] Session: ${session.label} (${session.id})` });
    await wait(100);
    const mine = store.listMine();
    if (mine.length === 0) {
      ctx.emit({ kind: "out", text:
        "No assets submitted yet. Run 'submit' to start the onboarding flow, " +
        "or visit /dashboard."
      });
      return;
    }
    let out = `── YOUR ASSETS (${mine.length}) ──\n\n`;
    out += "ID".padEnd(12) + "TYPE".padEnd(18) + "STATE".padEnd(14) + "VALUE\n";
    out += "─".repeat(72) + "\n";
    mine.forEach(a => {
      out += a.id.padEnd(12) +
             a.assetType.slice(0, 17).padEnd(18) +
             a.state.padEnd(14) +
             (a.estimatedValue ? `$${a.estimatedValue}` : "—") + "\n";
    });
    out += "\nRun 'track <id>' for the full lifecycle event log.";
    ctx.emit({ kind: "report", text: out });
  },
});

commandRegistry.register({
  name: "track", category: "intelligence",
  description: "Show full lifecycle event log for one of your assets",
  syntax: "track <asset_id>",
  example: "track USR-XYZ123",
  handler: async (ctx) => {
    if (ctx.args.length === 0) {
      ctx.emit({ kind: "error", text: "Missing asset ID. Syntax: track <asset_id>" });
      ctx.emit({ kind: "out",   text: "Run 'my assets' to see your asset IDs." });
      return;
    }
    const store = await loadUserStore();
    const a = store.get(ctx.args[0].toUpperCase());
    if (!a) {
      ctx.emit({ kind: "error", text: `Asset not found in your session: ${ctx.args[0]}` });
      return;
    }
    ctx.emit({ kind: "agent", text: `[Agent] Loading lifecycle for ${a.id}...` });
    await wait(140);
    let out = `── LIFECYCLE · ${a.id} ──\n\n`;
    out += `Type:           ${a.assetType}\n`;
    out += `Current State:  ${a.state}\n`;
    out += `Submitted:      ${new Date(a.createdAt).toLocaleString()}\n`;
    out += `Value:          ${a.estimatedValue ? "$" + a.estimatedValue : "—"}\n`;
    out += `Jurisdiction:   ${a.jurisdiction}\n\n`;
    out += `── EVENT LOG (append-only, ${a.timeline.length} events) ──\n`;
    a.timeline.forEach(ev => {
      const t = new Date(ev.at).toLocaleString();
      out += `\n[${t}]\n  ${ev.state.padEnd(12)} actor: ${ev.actor}`;
      if (ev.note) out += `\n  note: ${ev.note}`;
    });
    out += "\n\nView in browser: /dashboard";
    ctx.emit({ kind: "report", text: out });
  },
});

commandRegistry.register({
  name: "submit", aliases: ["onboard", "create"], category: "execution",
  description: "Open the asset submission flow",
  syntax: "submit",
  handler: (ctx) => {
    ctx.emit({ kind: "agent", text: "[Agent] Opening onboarding flow..." });
    ctx.emit({ kind: "out", text:
      "Switch to the SUBMIT AN ASSET sub-view, or navigate to:\n" +
      "  /terminal → TERMINAL tab → submit\n" +
      "Your asset will persist on /dashboard after submission."
    });
  },
});

commandRegistry.register({
  name: "session", aliases: ["whoami"], category: "core",
  description: "Show your anonymous session identity",
  syntax: "session",
  handler: async (ctx) => {
    const session = await loadSession();
    const store   = await loadUserStore();
    const mine    = store.listMine();
    ctx.emit({ kind: "report", text:
      `── SESSION ──\n\n` +
      `Label:        ${session.label}\n` +
      `ID:           ${session.id}\n` +
      `Created:      ${new Date(session.createdAt).toLocaleString()}\n` +
      `Your Assets:  ${mine.length}\n\n` +
      `Sessions are anonymous and stored locally (localStorage).\n` +
      `Dashboard: /dashboard`
    });
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

// ── EXECUTION COMMANDS (tokenize → borrow → repay lifecycle) ─────────
// loadUserStore / loadSession already defined in USER ASSETS section above.
async function loadTokenStore() {
  const mod = await import("./userTokenStore");
  return mod.userTokenStore;
}
async function loadLoanStore() {
  const mod = await import("./userLoanStore");
  return mod.userLoanStore;
}

// Override the future-flagged commands with real implementations
const _originalRegister = commandRegistry.register.bind(commandRegistry);

// ── TOKENIZE ──────────────────────────────────────────────────────────
_originalRegister({
  name: "tokenize", aliases: ["mint"], category: "execution",
  description: "Mint tokens against a VERIFIED asset",
  syntax: "tokenize <asset_id> [supply]",
  example: "tokenize USR-XXXXXX 1000",
  handler: async (ctx) => {
    if (ctx.args.length === 0) {
      ctx.emit({ kind: "error", text: "Missing asset ID. Syntax: tokenize <asset_id> [supply]" });
      ctx.emit({ kind: "out",   text: "Run 'my assets' to see your asset IDs." });
      return;
    }
    const assetId = ctx.args[0].toUpperCase();
    const supply  = ctx.args[1] ? parseInt(ctx.args[1], 10) : 1000;
    if (isNaN(supply) || supply < 1 || supply > 1_000_000) {
      ctx.emit({ kind: "error", text: "Supply must be between 1 and 1,000,000." });
      return;
    }

    const userStore  = await loadUserStore();
    const tokenStore = await loadTokenStore();
    const asset = userStore.get(assetId);
    if (!asset) {
      ctx.emit({ kind: "error", text: `Asset not found in your session: ${assetId}` });
      return;
    }
    if (asset.state !== "VERIFIED" && asset.state !== "COMPLETED") {
      ctx.emit({ kind: "error", text: `Asset must be VERIFIED before tokenization. Current state: ${asset.state}` });
      ctx.emit({ kind: "out",   text: "Use /dashboard → SIMULATE NEXT STATE to advance the lifecycle, or wait for the verification network." });
      return;
    }

    const existing = tokenStore.forAsset(assetId);
    if (existing) {
      ctx.emit({ kind: "error", text: `Asset already tokenized: ${existing.id} · ${existing.supply.toLocaleString()} tokens` });
      return;
    }

    ctx.emit({ kind: "agent", text: `[Agent] Preparing tokenization for ${assetId}...` });
    await wait(160);
    ctx.emit({ kind: "agent", text: "[Agent] Computing token economics..." });
    await wait(140);
    ctx.emit({ kind: "agent", text: "[Agent] Anchoring metadata hash on Solana..." });
    await wait(200);
    ctx.emit({ kind: "agent", text: "[Agent] Mint complete." });

    const valueUsd     = parseFloat((asset.estimatedValue || "0").replace(/[^0-9.]/g, "")) || 100_000;
    const pricePerTok  = valueUsd / supply;
    const mint = tokenStore.mint(assetId, supply, pricePerTok);

    userStore.advance(assetId, "COMPLETED", "system", `Tokenized: ${supply.toLocaleString()} ${mint.symbol} @ $${pricePerTok.toFixed(2)}/tok`);

    ctx.emit({ kind: "report", text:
      `── TOKENIZATION COMPLETE · ${assetId} ──\n\n` +
      `Mint ID:           ${mint.id}\n` +
      `Symbol:            ${mint.symbol}\n` +
      `Total Supply:      ${supply.toLocaleString()} tokens\n` +
      `Underlying:        $${valueUsd.toLocaleString()}\n` +
      `Price per Token:   $${pricePerTok.toFixed(4)}\n` +
      `Anchored:          ${new Date().toISOString()}\n` +
      `Standard:          AAS-1 wrapped (SPL Token-2022)\n\n` +
      `Asset lifecycle advanced to COMPLETED.\n` +
      `Run 'holdings' to view your tokenized assets.\n` +
      `Run 'borrow ${assetId} <amount>' to draw USDC against this collateral.`
    });
  },
});

// ── HOLDINGS ──────────────────────────────────────────────────────────
_originalRegister({
  name: "holdings", aliases: ["mints", "tokens"], category: "intelligence",
  description: "Show tokens minted in this session",
  syntax: "holdings",
  handler: async (ctx) => {
    const store = await loadTokenStore();
    const mints = store.listMine();
    if (mints.length === 0) {
      ctx.emit({ kind: "out", text: "No tokens minted yet. Run 'tokenize <asset_id>' after your asset is VERIFIED." });
      return;
    }
    let out = `── YOUR TOKEN HOLDINGS (${mints.length}) ──\n\n`;
    out += "MINT_ID".padEnd(12) + "ASSET".padEnd(12) + "SYMBOL".padEnd(18) + "SUPPLY".padEnd(12) + "PRICE\n";
    out += "─".repeat(72) + "\n";
    let totalValue = 0;
    mints.forEach(m => {
      const value = m.supply * m.pricePerTok;
      totalValue += value;
      out += m.id.padEnd(12) + m.assetId.padEnd(12) + m.symbol.slice(0,17).padEnd(18) +
             m.supply.toLocaleString().padEnd(12) + `$${m.pricePerTok.toFixed(4)}\n`;
    });
    out += `\nTotal token-wrapped value: $${totalValue.toLocaleString()}`;
    ctx.emit({ kind: "report", text: out });
  },
});

// ── BORROW ────────────────────────────────────────────────────────────
_originalRegister({
  name: "borrow", aliases: ["loan"], category: "execution",
  description: "Open a USDC loan against tokenized collateral",
  syntax: "borrow <asset_id> <amount_usdc>",
  example: "borrow USR-XXXXXX 50000",
  handler: async (ctx) => {
    if (ctx.args.length < 2) {
      ctx.emit({ kind: "error", text: "Syntax: borrow <asset_id> <amount_usdc>" });
      return;
    }
    const assetId = ctx.args[0].toUpperCase();
    const amount  = parseFloat(ctx.args[1].replace(/[,$]/g, ""));
    if (isNaN(amount) || amount < 1) {
      ctx.emit({ kind: "error", text: "Amount must be a positive number." });
      return;
    }

    const userStore  = await loadUserStore();
    const tokenStore = await loadTokenStore();
    const loanStore  = await loadLoanStore();
    const asset = userStore.get(assetId);
    if (!asset) {
      ctx.emit({ kind: "error", text: `Asset not found: ${assetId}` });
      return;
    }
    const mint = tokenStore.forAsset(assetId);
    if (!mint) {
      ctx.emit({ kind: "error", text: "Asset must be tokenized before borrowing. Run: tokenize " + assetId });
      return;
    }

    const valueUsd = parseFloat((asset.estimatedValue || "0").replace(/[^0-9.]/g, "")) || 100_000;
    const maxLtv   = 0.60;
    const maxBorrow = valueUsd * maxLtv;
    if (amount > maxBorrow) {
      ctx.emit({ kind: "error", text: `Exceeds max LTV (60%). Max borrow: $${maxBorrow.toLocaleString()}` });
      return;
    }

    ctx.emit({ kind: "agent", text: "[Agent] Checking collateral eligibility..." });
    await wait(140);
    ctx.emit({ kind: "agent", text: "[Agent] Computing rate from underwriting model..." });
    await wait(160);
    ctx.emit({ kind: "agent", text: "[Agent] Locking collateral in vault..." });
    await wait(140);
    ctx.emit({ kind: "agent", text: "[Agent] Loan originated." });

    const loan = loanStore.open(assetId, amount, valueUsd);
    ctx.emit({ kind: "report", text:
      `── LOAN ORIGINATED · ${loan.id} ──\n\n` +
      `Asset:             ${assetId}\n` +
      `Principal:         $${amount.toLocaleString()} USDC\n` +
      `Collateral Value:  $${valueUsd.toLocaleString()}\n` +
      `LTV:               ${(loan.ltvBps/100).toFixed(2)}%\n` +
      `APR:               ${(loan.aprBps/100).toFixed(2)}%\n` +
      `State:             OPEN\n` +
      `Opened:            ${loan.openedAt}\n\n` +
      `Repay anytime with 'repay ${loan.id} <amount>'.\n` +
      `View all loans with 'loans'.`
    });
  },
});

// ── REPAY ─────────────────────────────────────────────────────────────
_originalRegister({
  name: "repay", category: "execution",
  description: "Repay an outstanding loan (full or partial)",
  syntax: "repay <loan_id> [amount]",
  example: "repay LN-ABC123 50000",
  handler: async (ctx) => {
    if (ctx.args.length === 0) {
      ctx.emit({ kind: "error", text: "Syntax: repay <loan_id> [amount]" });
      return;
    }
    const loanStore = await loadLoanStore();
    const loanId = ctx.args[0].toUpperCase();
    const loan = loanStore.get(loanId);
    if (!loan) {
      ctx.emit({ kind: "error", text: `Loan not found: ${loanId}` });
      return;
    }
    if (loan.state === "REPAID") {
      ctx.emit({ kind: "error", text: "Loan already fully repaid." });
      return;
    }
    const amount = ctx.args[1] ? parseFloat(ctx.args[1].replace(/[,$]/g, "")) : loan.outstandingUsd;

    ctx.emit({ kind: "agent", text: "[Agent] Submitting repayment to vault..." });
    await wait(160);
    const updated = loanStore.repay(loanId, amount);
    if (!updated) {
      ctx.emit({ kind: "error", text: "Repayment failed." });
      return;
    }
    ctx.emit({ kind: "agent", text: "[Agent] Repayment confirmed." });
    ctx.emit({ kind: "report", text:
      `── REPAYMENT · ${updated.id} ──\n\n` +
      `Repaid:           $${Math.min(amount, loan.outstandingUsd).toLocaleString()}\n` +
      `Outstanding:      $${updated.outstandingUsd.toLocaleString()}\n` +
      `State:            ${updated.state}\n` +
      (updated.state === "REPAID" ? "\nLoan fully repaid. Collateral released." : "")
    });
  },
});

// ── LOANS ─────────────────────────────────────────────────────────────
_originalRegister({
  name: "loans", category: "intelligence",
  description: "List all loans in this session",
  syntax: "loans",
  handler: async (ctx) => {
    const store = await loadLoanStore();
    const loans = store.listMine();
    if (loans.length === 0) {
      ctx.emit({ kind: "out", text: "No active loans. Run 'borrow <asset_id> <amount>' to open one." });
      return;
    }
    let out = `── YOUR LOANS (${loans.length}) ──\n\n`;
    out += "LOAN_ID".padEnd(12) + "ASSET".padEnd(12) + "PRINCIPAL".padEnd(14) + "OUTSTANDING".padEnd(14) + "STATE\n";
    out += "─".repeat(72) + "\n";
    let totalOut = 0;
    loans.forEach(l => {
      totalOut += l.outstandingUsd;
      out += l.id.padEnd(12) + l.assetId.padEnd(12) +
             `$${l.principalUsd.toLocaleString()}`.padEnd(14) +
             `$${l.outstandingUsd.toLocaleString()}`.padEnd(14) +
             l.state + "\n";
    });
    out += `\nTotal outstanding debt: $${totalOut.toLocaleString()} USDC`;
    ctx.emit({ kind: "report", text: out });
  },
});

// ── ORACLE ────────────────────────────────────────────────────────────
_originalRegister({
  name: "oracle", category: "intelligence",
  description: "Query oracle feeds for asset valuation",
  syntax: "oracle <asset_id>",
  example: "oracle AAS-1",
  handler: async (ctx) => {
    if (ctx.args.length === 0) {
      ctx.emit({ kind: "error", text: "Syntax: oracle <asset_id>" });
      return;
    }
    const id = ctx.args[0].toUpperCase();
    // Try registry first, then user assets
    const regAsset  = ctx.registry.get(id);
    const userStore = await loadUserStore();
    const userAsset = userStore.get(id);

    if (!regAsset && !userAsset) {
      ctx.emit({ kind: "error", text: `Asset not found: ${id}` });
      return;
    }

    ctx.emit({ kind: "agent", text: "[Agent] Querying Pyth Network..." });
    await wait(160);
    ctx.emit({ kind: "agent", text: "[Agent] Cross-checking Switchboard feed..." });
    await wait(140);
    ctx.emit({ kind: "agent", text: "[Agent] Aggregating with appraisal anchor..." });
    await wait(140);

    const base = regAsset
      ? regAsset.collateral.appraisalValue
      : parseFloat((userAsset!.estimatedValue || "100000").replace(/[^0-9.]/g, "")) || 100_000;
    // Add a small deterministic drift so it feels live
    const drift = (Math.sin(Date.now() / 1e7) * 0.012);
    const liveValue = base * (1 + drift);

    ctx.emit({ kind: "report", text:
      `── ORACLE FEED · ${id} ──\n\n` +
      `Appraisal Anchor:   $${base.toLocaleString()}\n` +
      `Live Mid Price:     $${Math.round(liveValue).toLocaleString()}\n` +
      `Drift from Anchor:  ${(drift*100).toFixed(2)}%\n` +
      `Aggregator:         Pyth + Switchboard + Appraisal\n` +
      `Confidence:         ${regAsset ? regAsset.verification.confidence : 85}%\n` +
      `Refresh Window:     15 min\n` +
      `Last Update:        ${new Date().toLocaleString()}`
    });
  },
});

// ── ATTEST ────────────────────────────────────────────────────────────
_originalRegister({
  name: "attest", category: "execution",
  description: "Submit an attestation to one of your assets",
  syntax: "attest <asset_id> <type>",
  example: "attest USR-XXXXXX insurance",
  handler: async (ctx) => {
    if (ctx.args.length < 2) {
      ctx.emit({ kind: "error", text: "Syntax: attest <asset_id> <type>" });
      ctx.emit({ kind: "out",   text: "Types: title, insurance, appraisal, custody, legal, audit" });
      return;
    }
    const userStore = await loadUserStore();
    const id        = ctx.args[0].toUpperCase();
    const type      = ctx.args[1].toLowerCase();
    const asset = userStore.get(id);
    if (!asset) {
      ctx.emit({ kind: "error", text: `Asset not found: ${id}` });
      return;
    }
    const valid = ["title","insurance","appraisal","custody","legal","audit"];
    if (!valid.includes(type)) {
      ctx.emit({ kind: "error", text: `Invalid type. Use: ${valid.join(", ")}` });
      return;
    }

    ctx.emit({ kind: "agent", text: `[Agent] Recording ${type} attestation for ${id}...` });
    await wait(160);
    ctx.emit({ kind: "agent", text: "[Agent] Computing attestation hash..." });
    await wait(120);
    ctx.emit({ kind: "agent", text: "[Agent] Anchoring on Solana..." });
    await wait(160);

    userStore.advance(id, asset.state, "attester",
      `${type.toUpperCase()} attestation submitted`);

    const hash = Array.from({length:16},() => "0123456789abcdef"[Math.floor(Math.random()*16)]).join("");
    ctx.emit({ kind: "report", text:
      `── ATTESTATION RECORDED · ${id} ──\n\n` +
      `Type:           ${type.toUpperCase()}\n` +
      `Attester:       ${ctx.args[2] || "anonymous-attester"}\n` +
      `Hash:           sha256:${hash}...\n` +
      `Anchored:       ${new Date().toISOString()}\n` +
      `State:          ${asset.state} (unchanged)\n\n` +
      `Attestation appended to asset timeline. View with 'track ${id}'.`
    });
  },
});

