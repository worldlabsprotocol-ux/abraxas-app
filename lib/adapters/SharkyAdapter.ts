// FILE: lib/adapters/SharkyAdapter.ts
// Sharky.fi lending adapter.
// Replace fetch() stubs with real Sharky SDK calls when integrating.
// Docs: https://docs.sharky.fi

import type { ILendingProtocol, LoanOffer, ActiveLoan } from "./ILendingProtocol";

const SHARKY_API = "https://sharky.fi/api";
const MAX_BORROW_CAP = 50 * 1_000_000_000; // 50 SOL hard cap — never exceed this

export class SharkyAdapter implements ILendingProtocol {
  readonly name = "sharky";

  async getBestOffer(collateralMint: string): Promise<LoanOffer | null> {
    // STUB: Replace with real Sharky orderbook query
    // const res = await fetch(`${SHARKY_API}/loans/offers?nftMint=${collateralMint}`);
    // const data = await res.json();
    // return data.offers[0] ? mapSharkyOffer(data.offers[0]) : null;

    // Simulated offer for hackathon demo
    return {
      protocol:    "sharky",
      ltvPercent:  65,
      aprPercent:  42,
      maxBorrow:   Math.min(5 * 1_000_000_000, MAX_BORROW_CAP), // 5 SOL
      expiry:      Math.floor(Date.now() / 1000) + 86_400,
      offerPubkey: "SharkyOffer111111111111111111111111111111111",
    };
  }

  async executeLoan(params: {
    offer: LoanOffer; collateralMint: string;
    borrowAmount: number; borrowerWallet: string;
  }): Promise<{ txSignature: string; loan: ActiveLoan }> {
    if (params.borrowAmount > MAX_BORROW_CAP) {
      throw new Error(`Borrow amount exceeds MAX_BORROW_CAP (${MAX_BORROW_CAP} lamports)`);
    }
    // STUB: Real Sharky SDK takeLoan() call goes here
    const fakeSig = "Sharky" + Math.random().toString(36).slice(2, 30);
    return {
      txSignature: fakeSig,
      loan: {
        protocol: "sharky", loanPubkey: fakeSig.slice(0, 44),
        principal: params.borrowAmount, debt: params.borrowAmount,
        collateralMint: params.collateralMint,
        healthFactor: 1.8, dueAt: params.offer.expiry,
      },
    };
  }

  async repayLoan(params: { loan: ActiveLoan; repayAmount: number; payer: string }) {
    // STUB: Real Sharky repay call
    return { txSignature: "SharkyRepay" + Math.random().toString(36).slice(2), remainingDebt: Math.max(0, params.loan.debt - params.repayAmount) };
  }

  async monitorHealth(loanPubkey: string) {
    // STUB: Real Sharky loan health fetch
    return { healthFactor: 1.8, currentFloor: 6 * 1_000_000_000, currentDebt: 5 * 1_000_000_000, requiresAction: false };
  }
}