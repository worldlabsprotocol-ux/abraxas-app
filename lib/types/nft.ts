// FILE: lib/types/nft.ts
// Shared NFT types. Imported by API routes and client hooks alike.
// Single definition — no duplication.

export interface NormalizedCollection {
    id:          string;
    name:        string;
    image:       string | null;
    floorPrice:  number | null;   // native units (ETH or SOL)
    floorSymbol: string;          // "ETH" | "SOL"
    volume24h:   number | null;   // USD
    change24h:   number | null;   // % change in volume
    positive:    boolean;
    chain:       string;
    marketUrl:   string | null;
    source:      "reservoir_live";
    fetchedAt:   string;          // ISO timestamp
  }
  
  export interface NFTFeedResponse {
    ok:          boolean;
    collections: NormalizedCollection[];
    chain:       string;
    source:      string;
    fetchedAt:   string;
    error?:      string;
  }