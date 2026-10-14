// FILE: lib/persistence/chainNeutralSchemaReady.server.ts
import "server-only";

import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import {
  chainNeutralIdentitySchemaReadyDirect,
  chainNeutralIdvDocumentSchemaReadyDirect,
} from "@/lib/persistence/chainNeutralSchemaDirect";
import {
  chainNeutralIdentitySchemaReady as postgrestReady,
  chainNeutralIdvDocumentSchemaReady as postgrestDocReady,
} from "@/lib/persistence/chainNeutralSchemaReady";

export async function chainNeutralIdentitySchemaReadyServer(forceRefresh = false): Promise<boolean> {
  if (persistenceUsesDirectPostgres()) {
    return chainNeutralIdentitySchemaReadyDirect();
  }
  return postgrestReady(forceRefresh);
}

export async function chainNeutralIdvDocumentSchemaReadyServer(forceRefresh = false): Promise<boolean> {
  if (persistenceUsesDirectPostgres()) {
    return chainNeutralIdvDocumentSchemaReadyDirect();
  }
  return postgrestDocReady(forceRefresh);
}
