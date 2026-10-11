import { createHash } from "node:crypto";

function hashLeaf(data: string): string {
  return createHash("sha256").update(`leaf:${data}`, "utf8").digest("hex");
}

function hashPair(left: string, right: string): string {
  return createHash("sha256").update(`node:${left}${right}`, "utf8").digest("hex");
}

export type MerkleInclusionProof = {
  leaf_digest: string;
  siblings: string[];
  root: string;
};

export function verifyMerkleInclusion(proof: MerkleInclusionProof): boolean {
  let current = hashLeaf(proof.leaf_digest);
  for (const sibling of proof.siblings) {
    current = current < sibling ? hashPair(current, sibling) : hashPair(sibling, current);
  }
  return current === proof.root;
}

export function buildMerkleProofForLeaf(leaves: string[], targetLeaf: string): MerkleInclusionProof | null {
  if (!leaves.includes(targetLeaf)) return null;
  const hashed = leaves.map(hashLeaf);
  const layers: string[][] = [hashed];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next: string[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i];
      const right = prev[i + 1] ?? left;
      next.push(left < right ? hashPair(left, right) : hashPair(right, left));
    }
    layers.push(next);
  }
  const root = layers[layers.length - 1][0];
  const siblings: string[] = [];
  let idx = hashed.indexOf(hashLeaf(targetLeaf));
  for (let layer = 0; layer < layers.length - 1; layer++) {
    const row = layers[layer];
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx >= 0 && siblingIdx < row.length) siblings.push(row[siblingIdx]);
    idx = Math.floor(idx / 2);
  }
  return { leaf_digest: targetLeaf, siblings, root };
}
