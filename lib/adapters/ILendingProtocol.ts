// FILE: lib/adapters/ILendingProtocol.ts
// Protocol-agnostic lending interface.
// Add a new protocol by creating one file that implements this interface.

export interface LoanOffer {
    protocol:    string;        // "sharky" | "citrus" | "rain"
    ltvPercent:  number;        // e.g. 65 = 65% LTV
    aprPercent:  number;        // annualized borrow rate
    maxBorrow:   number;        // lamports
    expiry:      number;        // unix timestamp
    offerPubkey: string;        // on-chain offer account
  }
  
  export interface ActiveLoan {
    protocol:       string;
    loanPubkey:     string;
    principal:      number;     // lamports borrowed
    debt:           number;     // principal + accrued interest
    collateralMint: string;     // pNFT mint
    healthFactor:   number;     // debt / (collateral floor * ltv). <1.2 = danger
    dueAt:          number;     // unix timestamp
  }
  
  export interface ILendingProtocol {
    readonly name: string;
  
    // Find the best borrow offer for a given pNFT collateral
    getBestOffer(collateralMint: string): Promise<LoanOffer | null>;
  
    // Execute a borrow against an offer. Returns tx signature.
    executeLoan(params: {
      offer:          LoanOffer;
      collateralMint: string;
      borrowAmount:   number;   // lamports — must be <= offer.maxBorrow
      borrowerWallet: string;
    }): Promise<{ txSignature: string; loan: ActiveLoan }>;
  
    // Repay an active loan (partial or full)
    repayLoan(params: {
      loan:        ActiveLoan;
      repayAmount: number;      // lamports
      payer:       string;
    }): Promise<{ txSignature: string; remainingDebt: number }>;
  
    // Check current health factor and floor price for an active loan
    monitorHealth(loanPubkey: string): Promise<{
      healthFactor:  number;
      currentFloor:  number;    // lamports
      currentDebt:   number;    // lamports
      requiresAction:boolean;
    }>;
  }