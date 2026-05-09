// FILE: lib/loopscale.ts
// Loopscale Modular Vault — borrow USDC against RWA collateral.
// LTV: metals 80%, stocks 70%, timepieces 65%, collectibles 55%, other 50%.
// Fixed APR: 5.2% across all asset types (Loopscale protocol rate May 2026).

export interface LoopscaleQuote {
    borrowLimit:   number;   // max USDC borrowable
    fixedAPR:      string;   // "5.2%"
    provider:      string;   // "Loopscale Modular Vault"
    ltv:           number;   // 0–1
    assetValue:    number;
    weeklyPayment: number;   // estimated weekly interest at fixedAPR
  }
  
  const LTV_MAP: Record<string, number> = {
    metal:      0.80,
    metals:     0.80,
    stock:      0.70,
    stocks:     0.70,
    timepiece:  0.65,
    timepieces: 0.65,
    collectible:0.55,
    pokemon:    0.55,
    "one piece":0.55,
    sports:     0.55,
    comics:     0.55,
    luxury:     0.60,
    default:    0.50,
  };
  
  export function getLoopscaleLiquidity(assetValue: number, assetType: string): LoopscaleQuote {
    const key = assetType.toLowerCase();
    const ltv  = LTV_MAP[key] ?? LTV_MAP.default;
    const borrowLimit   = Math.floor(assetValue * ltv);
    const weeklyPayment = Math.round((borrowLimit * 0.052) / 52 * 100) / 100;
    return {
      borrowLimit,
      fixedAPR:      "5.2%",
      provider:      "Loopscale Modular Vault",
      ltv,
      assetValue,
      weeklyPayment,
    };
  }
  
  // ELO rating helpers for Arena progression
  export interface EloState {
    rating:      number;
    rank:        "Bronze" | "Silver" | "Gold" | "Platinum" | "Sovereign";
    wins:        number;
    losses:      number;
    streak:      number;
    prestige:    number;
    abraEarned:  number;
  }
  
  export function getRank(rating: number): EloState["rank"] {
    if (rating >= 2000) return "Sovereign";
    if (rating >= 1600) return "Platinum";
    if (rating >= 1300) return "Gold";
    if (rating >= 1100) return "Silver";
    return "Bronze";
  }
  
  export function calcEloChange(myRating: number, oppRating: number, won: boolean): number {
    const K  = 32;
    const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
    return Math.round(K * ((won ? 1 : 0) - expected));
  }
  
  export const RANK_COLORS: Record<EloState["rank"], string> = {
    Bronze:   "#CD7F32",
    Silver:   "#C0C0C0",
    Gold:     "#D4AF37",
    Platinum: "#6b8cff",
    Sovereign:"#a855f7",
  };