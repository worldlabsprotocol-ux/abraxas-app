// FILE: lib/protocol/portableRevocation/checkpointStore.ts

import type { PortableRevocationCheckpoint } from "./contract";

export interface PortableRevocationCheckpointStore {
  getCheckpoint(revocationIssuerId: string): Promise<PortableRevocationCheckpoint | null>;
  setCheckpoint(checkpoint: PortableRevocationCheckpoint): Promise<void>;
}

export class InMemoryPortableRevocationCheckpointStore implements PortableRevocationCheckpointStore {
  private readonly byIssuer = new Map<string, PortableRevocationCheckpoint>();

  async getCheckpoint(revocationIssuerId: string): Promise<PortableRevocationCheckpoint | null> {
    return this.byIssuer.get(revocationIssuerId) ?? null;
  }

  async setCheckpoint(checkpoint: PortableRevocationCheckpoint): Promise<void> {
    this.byIssuer.set(checkpoint.revocation_issuer_id, checkpoint);
  }
}
