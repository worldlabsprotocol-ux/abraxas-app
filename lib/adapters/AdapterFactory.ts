// FILE: lib/adapters/AdapterFactory.ts
// Adding a new protocol = one file + one line here. Nothing else changes.

import type { ILendingProtocol, LoanOffer } from "./ILendingProtocol";
import { SharkyAdapter } from "./SharkyAdapter";
import { CitrusAdapter } from "./CitrusAdapter";
// To add Rain.fi: import { RainAdapter } from "./RainAdapter";

const REGISTRY: Record<string, ILendingProtocol> = {
  sharky: new SharkyAdapter(),
  citrus: new CitrusAdapter(),
  // rain: new RainAdapter(),
};

export function getAdapter(protocol: string): ILendingProtocol {
  const adapter = REGISTRY[protocol];
  if (!adapter) throw new Error(`Unknown protocol: ${protocol}`);
  return adapter;
}

// Query all protocols and return the best offer (highest LTV, lowest APR)
export async function getBestOfferAcrossProtocols(collateralMint: string): Promise<{
  offer:   LoanOffer;
  adapter: ILendingProtocol;
} | null> {
  const results = await Promise.allSettled(
    Object.values(REGISTRY).map(async (a) => ({
      offer:   await a.getBestOffer(collateralMint),
      adapter: a,
    }))
  );

  const valid = results
    .filter((r): r is PromiseFulfilledResult<{offer:LoanOffer|null;adapter:ILendingProtocol}> =>
      r.status === "fulfilled" && r.value.offer !== null)
    .map((r) => r.value as {offer:LoanOffer;adapter:ILendingProtocol});

  if (valid.length === 0) return null;

  // Rank: highest LTV first, then lowest APR as tiebreak
  return valid.sort((a, b) =>
    b.offer.ltvPercent - a.offer.ltvPercent ||
    a.offer.aprPercent - b.offer.aprPercent
  )[0];
}

// Refinance: find a better deal and migrate the loan
export async function refinanceIfBetter(
  activeLoan: import("./ILendingProtocol").ActiveLoan,
  currentProtocol: string,
  collateralMint:  string,
  borrowerWallet:  string,
): Promise<{ refinanced: boolean; txSignature?: string; newProtocol?: string }> {
  const best = await getBestOfferAcrossProtocols(collateralMint);
  if (!best || best.adapter.name === currentProtocol) return { refinanced: false };

  const current = REGISTRY[currentProtocol];
  if (!current) return { refinanced: false };

  // Only refinance if APR improves by >2% (avoid churn)
  const currentOffer = await current.getBestOffer(collateralMint);
  if (!currentOffer || best.offer.aprPercent >= currentOffer.aprPercent - 2) {
    return { refinanced: false };
  }

  // 1. Repay current loan
  await current.repayLoan({ loan: activeLoan, repayAmount: activeLoan.debt, payer: borrowerWallet });
  // 2. Take new loan on better protocol
  const { txSignature } = await best.adapter.executeLoan({
    offer:          best.offer,
    collateralMint,
    borrowAmount:   activeLoan.principal,
    borrowerWallet,
  });
  return { refinanced: true, txSignature, newProtocol: best.adapter.name };
}