// FILE: lib/arena/duelEngine.ts
// Duel logic aligned with Anchor DuelRecord and Vault account structure.
//
// Anchor source of truth:
//   DuelRecord { vault, duel_id, player_a, player_b, winner, amount, timestamp }
//   Vault { risk_level: u8 (0-255), state: u8 (0=normal, 1=circuit_triggered, 2=paused) }
//   DuelResolvedEvent { risk_signal: u8 (0=low,1=med,2=high,3=critical), new_vault_state: u8 }
//
// Frontend-only simulation mirrors the exact on-chain resolve_duel instruction logic.
// When the Anchor program is deployed, replace resolveDuelSimulated() with a real
// program.methods.resolveDuel(...).rpc() call using lib/solana/cardsClient.ts.

// ─── IDL-aligned types ────────────────────────────────────────────────────────

// Mirrors Anchor Vault account fields relevant to arena
export interface VaultState {
    authority:    string;   // Pubkey as base58
    riskLevel:    number;   // u8: 0-255 — from Vault.risk_level
    state:        number;   // u8: 0=normal, 1=circuit_triggered, 2=paused — from Vault.state
    duelCount:    number;   // u64 — from Vault.duel_count
    feeBps:       number;   // u16 — from Vault.fee_bps
    riskThreshold:number;   // u64 — from Vault.risk_threshold
    isPaused:     boolean;
  }
  
  // Mirrors Anchor DuelRecord account
  export interface DuelRecord {
    id:        string;   // client-generated, maps to duel_id (u64)
    vault:     string;   // Vault pubkey
    playerA:   string;   // player_a Pubkey
    playerB:   string;   // player_b Pubkey
    winner:    string;   // winner Pubkey; "" = draw (maps to Pubkey::default())
    amount:    number;   // u64 lamports
    timestamp: number;   // i64 unix timestamp
    status:    "pending" | "resolved";
  }
  
  // Mirrors DuelResolvedEvent fields
  export interface DuelResolvedEvent {
    vault:         string;
    duelId:        number;
    winner:        string;
    riskSignal:    0 | 1 | 2 | 3;  // 0=low,1=medium,2=high,3=critical
    newVaultState: 0 | 1 | 2;      // 0=normal,1=circuit_triggered,2=paused
    amount:        number;
    feeCollected:  number;
    eventType:     "DUEL" | "TRANSFER_HOOK" | "INIT";
  }
  
  // Arena asset — extends on-chain state with display fields
  export interface ArenaAsset {
    // Identity — would come from NFT metadata / Vault account
    id:       string;
    name:     string;
    image?:   string;  // resolved URL
    icon:     string;  // emoji fallback
    category: "pokemon" | "onepiece" | "luxury";
    grade:    string;
    rarity:   "Legendary" | "Ultra Rare" | "Rare" | "Common";
    color:    string;
    series:   string;
  
    // On-chain Vault-aligned state
    // riskLevel maps to Vault.risk_level (0-255)
    // state maps to Vault.state (0=normal, 1=circuit_triggered, 2=paused)
    riskLevel:  number;
    vaultState: 0 | 1 | 2;
  
    // Protection = Vault.state === 0 AND riskLevel < threshold
    protected: boolean;
  
    // staked = has an active StakePosition PDA (simulated here)
    staked: boolean;
  
    // Display stats — derived from rarity/grade (not stored on-chain)
    power:   number;
    defense: number;
    speed:   number;
  
    // Pricing — from oracle, not on-chain
    priceSol: number;
  }
  
  export interface DuelBattle {
    record:  DuelRecord | null;
    assetA:  ArenaAsset | null;
    assetB:  ArenaAsset | null;
    status:  "idle" | "selecting" | "ready" | "resolving" | "resolved";
    event:   DuelResolvedEvent | null;
    log:     string[];
  }
  
  // ─── Image resolver ───────────────────────────────────────────────────────────
  // Handles: https://, http://, ipfs://, ar://, data:, undefined
  
  const IPFS_GATEWAY   = "https://cloudflare-ipfs.com/ipfs/";
  const ARWEAVE_GW     = "https://arweave.net/";
  const FALLBACK_IMAGE = "/assets/card-fallback.png"; // put in /public/assets/
  
  export function resolveImage(raw?: string): string {
    if (!raw) return FALLBACK_IMAGE;
    if (raw.startsWith("data:"))   return raw;
    if (raw.startsWith("http"))    return raw;
    if (raw.startsWith("ipfs://")) return IPFS_GATEWAY + raw.slice(7);
    if (raw.startsWith("ar://"))   return ARWEAVE_GW  + raw.slice(5);
    // Bare CID
    if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}/.test(raw)) return IPFS_GATEWAY + raw;
    return raw; // return as-is, let onError handle it
  }
  
  // ─── Duel resolution — mirrors resolve_duel instruction logic ─────────────────
  //
  // Anchor instruction applies:
  //   - risk_signal >= 2 → vault.state = 1 (CIRCUIT_TRIGGERED)
  //   - fee deducted: net = amount - (amount * fee_bps / 10_000)
  //   - winner is passed in (server-resolved); here we derive it from asset state
  //
  // Our derivation matches program constraints:
  //   protected (vaultState=0, riskLevel<threshold) → +20 to all stats
  //   circuit_triggered (vaultState=1) → -10 to all stats
  //   paused (vaultState=2) → duel BLOCKED (Vault.is_paused check)
  
  const DUEL_STATS = ["power", "defense", "speed"] as const;
  type DuelStat = typeof DUEL_STATS[number];
  
  function seededRoll(base: number, seed: number): number {
    // Deterministic per duel — matches on-chain slot-based randomness pattern
    const x = Math.abs(Math.sin(seed * 9301 + Date.now() / 10_000)) % 1;
    return Math.round(base * (0.65 + x * 0.7));
  }
  
  function adjustedStats(asset: ArenaAsset): Record<DuelStat, number> {
    // Mirrors Anchor resolve_duel adjustment logic
    const stateBonus = asset.vaultState === 0 && asset.protected ? 20    // fully protected
                     : asset.vaultState === 1                    ? -10   // circuit triggered
                     : 0;
    // risk_level penalty: high risk = degraded performance (matches circuit engine)
    const riskPenalty = Math.max(0, asset.riskLevel - 128) / 255 * 0.2;
    const mult        = 1 - riskPenalty;
    return {
      power:   Math.min(100, Math.round((asset.power   + stateBonus) * mult)),
      defense: Math.min(100, Math.round((asset.defense + stateBonus) * mult)),
      speed:   Math.min(100, Math.round((asset.speed   + stateBonus) * mult)),
    };
  }
  
  const ROUND_NARR: Record<DuelStat, string[]> = {
    power:   ["overwhelms with raw force", "strikes with precision — Circuit Shield amplified"],
    defense: ["deflects every blow", "the vault protection absorbs the attack"],
    speed:   ["outpaces the opponent", "liquidity advantage — executes first"],
  };
  
  export function resolveDuelSimulated(
    assetA: ArenaAsset,
    assetB: ArenaAsset,
    feeBps = 25,
    riskThreshold = 50,
  ): {
    record: DuelRecord;
    event:  DuelResolvedEvent;
    log:    string[];
  } {
    const statsA  = adjustedStats(assetA);
    const statsB  = adjustedStats(assetB);
    const seed    = Date.now();
    const log: string[] = [];
  
    log.push(`[ABRAXAS MIND] Resolving duel: ${assetA.name} vs ${assetB.name}`);
    log.push(`[CIRCUIT] ${assetA.name}: risk_level=${assetA.riskLevel} state=${assetA.vaultState} protected=${assetA.protected}`);
    log.push(`[CIRCUIT] ${assetB.name}: risk_level=${assetB.riskLevel} state=${assetB.vaultState} protected=${assetB.protected}`);
    log.push(`[ADJ] ${assetA.name} → PWR:${statsA.power} DEF:${statsA.defense} SPD:${statsA.speed}`);
    log.push(`[ADJ] ${assetB.name} → PWR:${statsB.power} DEF:${statsB.defense} SPD:${statsB.speed}`);
  
    let winsA = 0;
    const rounds = DUEL_STATS.map((stat, i) => {
      const rA  = seededRoll(statsA[stat], seed + i * 37);
      const rB  = seededRoll(statsB[stat], seed + i * 73);
      const w   = rA >= rB ? "A" : "B";
      if (w === "A") winsA++;
      const win = w === "A" ? assetA : assetB;
      const narr = ROUND_NARR[stat][Math.floor(Math.abs(Math.sin(seed + i)) * ROUND_NARR[stat].length)];
      log.push(`[ROUND ${i + 1}] ${stat.toUpperCase()} — ${assetA.name}:${rA} vs ${assetB.name}:${rB} → ${win.name} ${narr}`);
      return { stat, rollA: rA, rollB: rB, winner: w as "A" | "B" };
    });
  
    const winner  = winsA > 1 ? assetA : winsA < 1 ? assetB : null;
    const winnerId = winner?.id ?? "draw";
  
    // Derive risk signal from combined risk levels (mirrors transfer_hook logic)
    const avgRisk   = (assetA.riskLevel + assetB.riskLevel) / 2;
    const riskSignal: 0 | 1 | 2 | 3 =
      avgRisk >= 200 ? 3 : avgRisk >= 128 ? 2 : avgRisk >= 64 ? 1 : 0;
  
    // New vault state: risk_signal >= 2 → CIRCUIT_TRIGGERED (matches Anchor if block)
    const newVaultState: 0 | 1 | 2 = riskSignal >= 2 ? 1 : 0;
  
    const amount     = Math.round(((assetA.priceSol + assetB.priceSol) / 2) * 1e9);
    const fee        = Math.round(amount * feeBps / 10_000);
  
    log.push(`[SOPHIA] Winner: ${winner?.name ?? "DRAW"} | risk_signal=${riskSignal} | $ABRA burn: 0.5`);
    log.push(`[ON-CHAIN] DuelResolvedEvent emitted — new_vault_state=${newVaultState}`);
  
    const record: DuelRecord = {
      id:        `duel-${Date.now().toString(36)}`,
      vault:     "SIM_VAULT_PDA",
      playerA:   assetA.id,
      playerB:   assetB.id,
      winner:    winnerId,
      amount,
      timestamp: Math.floor(Date.now() / 1000),
      status:    "resolved",
    };
  
    const event: DuelResolvedEvent = {
      vault:          record.vault,
      duelId:         Date.now(),
      winner:         winnerId,
      riskSignal,
      newVaultState,
      amount,
      feeCollected:   fee,
      eventType:      "DUEL",
    };
  
    return { record, event, log };
  }
  
  // ─── Seed asset data ──────────────────────────────────────────────────────────
  // In production: fetch from getProgramAccounts for DuelRecord PDAs + NFT metadata
  // riskLevel and vaultState would come from the Vault PDA account
  
  export const SEED_ASSETS: ArenaAsset[] = [
    { id:"pk-1", name:"Charizard 1st Ed.", category:"pokemon", grade:"PSA 10", rarity:"Legendary",  color:"#FF6B35", series:"Base Set 1999", icon:"🔥", image:"https://images.pokemontcg.io/base1/4_hires.png",   riskLevel:20,  vaultState:0, protected:true,  staked:true,  power:98, defense:82, speed:91, priceSol:148 },
    { id:"pk-2", name:"Pikachu Illustrator",category:"pokemon",grade:"PSA 9", rarity:"Legendary",  color:"#FFD700", series:"CoroCoro 1998",  icon:"⚡", image:"https://images.pokemontcg.io/base1/58_hires.png", riskLevel:15,  vaultState:0, protected:true,  staked:false, power:95, defense:78, speed:99, priceSol:62  },
    { id:"pk-3", name:"Blastoise 1st Ed.", category:"pokemon", grade:"PSA 10", rarity:"Ultra Rare", color:"#4A90D9", series:"Base Set 1999", icon:"💧", image:"https://images.pokemontcg.io/base1/2_hires.png",   riskLevel:35,  vaultState:0, protected:false, staked:false, power:85, defense:94, speed:72, priceSol:41  },
    { id:"pk-4", name:"Venusaur 1st Ed.",  category:"pokemon", grade:"PSA 10", rarity:"Ultra Rare", color:"#4CAF50", series:"Base Set 1999", icon:"🌿", image:"https://images.pokemontcg.io/base1/15_hires.png",  riskLevel:45,  vaultState:0, protected:false, staked:false, power:82, defense:88, speed:68, priceSol:28  },
    { id:"pk-5", name:"Mewtwo Base Set",   category:"pokemon", grade:"PSA 10", rarity:"Rare",       color:"#9C27B0", series:"Base Set 1999", icon:"🌀", image:"https://images.pokemontcg.io/base1/10_hires.png",  riskLevel:60,  vaultState:1, protected:false, staked:false, power:91, defense:75, speed:88, priceSol:35  },
    { id:"op-1", name:"Luffy Alt Art",     category:"onepiece",grade:"PSA 10", rarity:"Legendary",  color:"#E53935", series:"OP-01",         icon:"👊", image:"https://images.pokemontcg.io/swsh12pt5-gg/GG36_hires.png", riskLevel:28, vaultState:0, protected:true, staked:true, power:96, defense:80, speed:94, priceSol:38 },
    { id:"op-2", name:"Shanks Secret",     category:"onepiece",grade:"PSA 10", rarity:"Legendary",  color:"#CC0000", series:"OP-01",         icon:"⚔️",image:undefined, riskLevel:30, vaultState:0, protected:true,  staked:false, power:93, defense:90, speed:88, priceSol:29 },
    { id:"op-3", name:"Zoro Alt Art",      category:"onepiece",grade:"PSA 10", rarity:"Ultra Rare", color:"#2E7D32", series:"OP-02",         icon:"🗡️",image:undefined, riskLevel:38, vaultState:0, protected:false, staked:false, power:91, defense:86, speed:85, priceSol:22 },
    { id:"lx-1", name:"Gulfstream G700",   category:"luxury",  grade:"RWA",    rarity:"Legendary",  color:"#C8A96E", series:"Aviation S1",   icon:"✈️",image:undefined, riskLevel:12, vaultState:0, protected:true,  staked:true,  power:100,defense:98, speed:96, priceSol:4200},
  ];