import { createHash, randomBytes } from "node:crypto";
import { keccak256, stringToBytes } from "viem";

export function opaqueOrganizationRef(seed: string): string {
  return `org_${createHash("sha256").update(`organization-eligibility:${seed}`).digest("hex").slice(0, 24)}`;
}

export function opaqueActorRef(seed: string): string {
  return `act_${createHash("sha256").update(`organization-actor:${seed}`).digest("hex").slice(0, 24)}`;
}

export function organizationAudienceHash(partnerId: string): string {
  return createHash("sha256").update(`organization-audience:${partnerId}`).digest("hex");
}

export function organizationPartnerHmac(partnerId: string): string {
  return createHash("sha256").update(`organization-partner:${partnerId}`).digest("hex");
}

export function organizationDerivationHash(parts: string[]): string {
  return createHash("sha256").update(`organization-derivation:${parts.join("|")}`).digest("hex");
}

export function hashOrganizationSubjectBinding(value: string): `0x${string}` {
  return keccak256(stringToBytes(value.trim()));
}

export function newOrganizationSeed(): string {
  return randomBytes(16).toString("hex");
}
