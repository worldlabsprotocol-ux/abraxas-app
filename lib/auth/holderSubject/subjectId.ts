// FILE: lib/auth/holderSubject/subjectId.ts

import { randomBytes } from "crypto";
import { HOLDER_SUBJECT_PREFIX } from "./contract";

export function isChainNeutralHolderSubjectId(value: string): boolean {
  return /^abx_hs_[0-9a-f]{32}$/.test(value.trim());
}

export function createHolderSubjectId(): string {
  return `${HOLDER_SUBJECT_PREFIX}${randomBytes(16).toString("hex")}`;
}
