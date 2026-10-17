// FILE: lib/auth/nativeAccount/subjectId.ts

import { randomBytes } from "crypto";
import { ACCOUNT_SUBJECT_PREFIX } from "./contract";

export function isNativeAccountId(value: string): boolean {
  return /^abx_ac_[0-9a-f]{32}$/.test(value.trim());
}

export function createNativeAccountId(): string {
  return `${ACCOUNT_SUBJECT_PREFIX}${randomBytes(16).toString("hex")}`;
}
