// FILE: lib/adapters/CitrusAdapter.ts
// Citrus lending adapter.
// Replace stubs with Citrus SDK calls when integrating.

import type { ILendingProtocol, LoanOffer, ActiveLoan } from "./ILendingProtocol";

const MAX_BORROW_CAP = 50 * 1_000_000_000;

export class CitrusAdapter implements ILendingProtocol {
  readonly name = "citrus";

  async getBestOffer(collateralMint: string): Promise<LoanOffer | null> {
    // STUB: Replace with Citrus API call
    return {
      protocol:    "citrus",
      ltvPercent:  70,          // Citrus typically offers higher LTV
      aprPercent:  38,          // and lower APR in this demo scenario
      maxBorrow:   Math.min(5_500_000_000, MAX_BORROW_CAP),
      expiry:      Math.floor(Date.now() / 1000) + 86_400 * 7,
      offerPubkey: "CitrusOffer11111111111111111111111111111111",
    };
  }

  async executeLoan(params: {
    offer: LoanOffer; collateralMint: string;
    borrowAmount: number; borrowerWallet: string;
  }): Promise<{ txSignature: string; loan: ActiveLoan }> {
    if (params.borrowAmount > MAX_BORROW_CAP) throw new Error("Exceeds MAX_BORROW_CAP");
    const fakeSig = "Citrus" + Math.random().toString(36).slice(2, 30);
    return {
      txSignature: fakeSig,
      loan: {
        protocol: "citrus", loanPubkey: fakeSig.slice(0, 44),
        principal: params.borrowAmount, debt: params.borrowAmount,
        collateralMint: params.collateralMint,
        healthFactor: 2.1, dueAt: params.offer.expiry,
      },
    };
  }

  async repayLoan(params: { loan: ActiveLoan; repayAmount: number; payer: string }) {
    return { txSignature: "CitrusRepay" + Math.random().toString(36).slice(2), remainingDebt: Math.max(0, params.loan.debt - params.repayAmount) };
  }

  async monitorHealth(loanPubkey: string) {
    return { healthFactor: 2.1, currentFloor: 6_500_000_000, currentDebt: 5_500_000_000, requiresAction: false };
  }
}