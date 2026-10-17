// FILE: lib/auth/nativeAccount/contract.ts

export const ACCOUNT_SUBJECT_PREFIX = "abx_ac_";

export type AbraxasAccountStatus = "active" | "locked" | "suspended";

export type PartnerMembershipRole = "owner" | "admin" | "operator";

export type MembershipGrantMethod = "api_key_proof" | "sandbox_enroll" | "invitation";
