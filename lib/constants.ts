export const ABRA = {
  ca:          "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
  caShort:     "5c1FHZ…BAGS",
  ticker:      "$ABRA",
  chain:       "Solana",
  solscan:     "https://solscan.io/token/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
  bags:        "https://bags.fm/$WORLDLABSPROTOCOL-UX",
  dexscreener: "https://dexscreener.com/solana/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
} as const;

/**
 * Vault authority — the server-side keypair that signs Token-2022 mints.
 * Funded with 0.05 SOL on mainnet.
 * Private key lives in VAULT_AUTHORITY_SECRET env var only — never committed.
 */
export const VAULT_AUTHORITY = {
  pubkey:   "65JkcHbtaEaJHyNjCF8BxQHcYQub8XwgJnRLDfztiBqA",
  solscan:  "https://solscan.io/account/65JkcHbtaEaJHyNjCF8BxQHcYQub8XwgJnRLDfztiBqA",
} as const;

/**
 * Real on-chain vault wallets — all five funded and verifiable on Solscan.
 * These are the wallets that agents transact through.
 * Funding: send 0.001 SOL to each to establish on-chain presence.
 */
export const VAULT_WALLETS: Record<string, {
  address: string;
  solscan: string;
  shortAddress: string;
}> = {
  "490": {
    address:      "CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf",
    solscan:      "https://solscan.io/account/CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf",
    shortAddress: "CQ1UzR…dJGdf",
  },
  "491": {
    address:      "CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk",
    solscan:      "https://solscan.io/account/CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk",
    shortAddress: "CmWVgy…tdDk",
  },
  "492": {
    address:      "8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58",
    solscan:      "https://solscan.io/account/8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58",
    shortAddress: "8bBxip…fT58",
  },
  "493": {
    address:      "Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf",
    solscan:      "https://solscan.io/account/Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf",
    shortAddress: "Db6RHG…TFf",
  },
  "494": {
    address:      "HeFqPHNCTgZ68fxaGgJes9af16W63mg7UbZUy5LScwZq",
    solscan:      "https://solscan.io/account/HeFqPHNCTgZ68fxaGgJes9af16W63mg7UbZUy5LScwZq",
    shortAddress: "HeFqPH…wZq",
  },
};

export const LINKS = {
  twitter: "https://twitter.com/pabloretroworld",
  article: "https://medium.com/@ammmasteracey/a-b-r-a-x-a-s-390bd94d9e15",
} as const;