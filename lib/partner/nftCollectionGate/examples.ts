// NFT or collection-gated access starter.
// Partner-owned indexer performs the ownership/trait lookup. Abraxas does not mint,
// transfer, custody, or value-guarantee NFTs.

export function nftCollectionGateServerExample(): string {
  return `// Partner-owned server route. Keep indexer credentials server-side.
const COLLECTION_ID = "YOUR_COLLECTION_ID";
const INDEXER_URL = "YOUR_NFT_INDEXER_URL";
const REQUIRED_TRAIT = { trait_type: "YOUR_TRAIT_TYPE", value: "YOUR_TRAIT_VALUE" };

export async function verifyCollectionGate(input: {
  owner: string;
  tokenId?: string;
  receiptId: string;
}) {
  const query = new URLSearchParams({ owner: input.owner, collection: COLLECTION_ID });
  if (input.tokenId) query.set("token_id", input.tokenId);
  const ownershipResponse = await fetch(\`\${INDEXER_URL}/ownership?\${query}\`, { cache: "no-store" });
  if (!ownershipResponse.ok) return { ok: false, reason: "ownership_lookup_failed" };
  const ownership = await ownershipResponse.json() as {
    verified?: boolean;
    collection?: string;
    trait?: { trait_type?: string; value?: string };
  };
  const traitMatches = ownership.trait?.trait_type === REQUIRED_TRAIT.trait_type
    && ownership.trait?.value === REQUIRED_TRAIT.value;
  if (!ownership.verified || ownership.collection !== COLLECTION_ID || !traitMatches) {
    return { ok: false, reason: "collection_or_trait_not_verified" };
  }

  // Re-fetch the current Abraxas receipt before granting access.
  const receiptResponse = await fetch(
    \`https://YOUR_ABRAXAS_HOST/api/receipts/\${encodeURIComponent(input.receiptId)}/public\`,
    { cache: "no-store" },
  );
  if (!receiptResponse.ok) return { ok: false, reason: "receipt_lookup_failed" };
  const receipt = await receiptResponse.json() as { ok?: boolean; result?: string };
  if (!receipt.ok || receipt.result !== "approved") return { ok: false, reason: "receipt_not_approved" };

  return { ok: true, action: "grant_collection_access", collection: COLLECTION_ID, tokenId: input.tokenId ?? null };
}
`; 
}
