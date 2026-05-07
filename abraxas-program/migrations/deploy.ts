// FILE: abraxas-program/migrations/deploy.ts
// Anchor migration script — runs during `anchor migrate`.
// NOTE: This file is excluded from Next.js TypeScript compilation via tsconfig.json.
// It is NOT part of the Next.js app bundle.

// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";

module.exports = async function (provider: anchor.AnchorProvider) {
  anchor.setProvider(provider);
  // Add migration logic here
};