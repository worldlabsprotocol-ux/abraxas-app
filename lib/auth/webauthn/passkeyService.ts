// FILE: lib/auth/webauthn/passkeyService.ts

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { createNativeAccountId, isNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import {
  consumeWebAuthnChallengeAtomic,
  findPasskeyByCredentialId,
  insertNativeAccount,
  insertPasskeyRecord,
  insertWebAuthnChallenge,
  loadWebAuthnChallenge,
  updatePasskeySignCount,
  NativeAccountStoreUnavailableError,
} from "@/lib/auth/nativeAccount/store";
import { WEBAUTHN_CHALLENGE_TTL_SEC, WEBAUTHN_RP_NAME } from "./rpConfig";

export type PasskeyRegisterBeginResult =
  | {
      ok: true;
      challengeId: string;
      accountId: string;
      options: Awaited<ReturnType<typeof generateRegistrationOptions>>;
    }
  | { ok: false; code: "store_unavailable" | "invalid_account" };

export async function beginPasskeyRegistration(input: {
  accountId?: string | null;
  origin: string;
  rpId: string;
}): Promise<PasskeyRegisterBeginResult> {
  let accountId = input.accountId?.trim() ?? null;
  if (accountId && !isNativeAccountId(accountId)) {
    return { ok: false, code: "invalid_account" };
  }
  if (!accountId) {
    accountId = createNativeAccountId();
  }
  try {
    await insertNativeAccount(accountId);
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) {
      return { ok: false, code: "store_unavailable" };
    }
    throw error;
  }

  const options = await generateRegistrationOptions({
    rpName: WEBAUTHN_RP_NAME,
    rpID: input.rpId,
    userName: accountId,
    userDisplayName: "Abraxas account",
    userID: Buffer.from(accountId, "utf8"),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  try {
    const challengeId = await insertWebAuthnChallenge({
      purpose: "register",
      accountId,
      challenge: options.challenge,
      origin: input.origin,
      rpId: input.rpId,
      ttlSec: WEBAUTHN_CHALLENGE_TTL_SEC,
    });
    return { ok: true, challengeId, accountId, options };
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) {
      return { ok: false, code: "store_unavailable" };
    }
    throw error;
  }
}

export type PasskeyRegisterFinishResult =
  | { ok: true; accountId: string; verified: true }
  | { ok: false; code: string };

export async function finishPasskeyRegistration(input: {
  challengeId: string;
  origin: string;
  rpId: string;
  response: RegistrationResponseJSON;
}): Promise<PasskeyRegisterFinishResult> {
  const stored = await consumeWebAuthnChallengeAtomic(input.challengeId);
  if (!stored || stored.purpose !== "register") return { ok: false, code: "challenge_not_found" };
  if (stored.origin !== input.origin || stored.rp_id !== input.rpId) {
    return { ok: false, code: "origin_or_rp_mismatch" };
  }
  if (!stored.account_id || !isNativeAccountId(stored.account_id)) {
    return { ok: false, code: "invalid_account" };
  }

  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: stored.challenge,
    expectedOrigin: input.origin,
    expectedRPID: input.rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, code: "verification_failed" };
  }

  const { credential, aaguid } = verification.registrationInfo;
  await insertPasskeyRecord({
    accountId: stored.account_id,
    credentialId: credential.id,
    publicKeyCose: isoBase64URL.fromBuffer(credential.publicKey),
    signCount: credential.counter,
    transports: (credential.transports ?? []) as string[],
    aaguid: aaguid ?? null,
  });

  return { ok: true, accountId: stored.account_id, verified: true };
}

export async function beginPasskeyAuthentication(input: {
  origin: string;
  rpId: string;
}): Promise<
  | { ok: true; challengeId: string; options: Awaited<ReturnType<typeof generateAuthenticationOptions>> }
  | { ok: false; code: "store_unavailable" }
> {
  const options = await generateAuthenticationOptions({
    rpID: input.rpId,
    userVerification: "preferred",
  });

  try {
    const challengeId = await insertWebAuthnChallenge({
      purpose: "authenticate",
      accountId: null,
      challenge: options.challenge,
      origin: input.origin,
      rpId: input.rpId,
      ttlSec: WEBAUTHN_CHALLENGE_TTL_SEC,
    });
    return { ok: true, challengeId, options };
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) {
      return { ok: false, code: "store_unavailable" };
    }
    throw error;
  }
}

export async function finishPasskeyAuthentication(input: {
  challengeId: string;
  origin: string;
  rpId: string;
  response: AuthenticationResponseJSON;
}): Promise<
  | { ok: true; accountId: string; verified: true }
  | { ok: false; code: string }
> {
  const passkey = await findPasskeyByCredentialId(input.response.id);
  if (!passkey || passkey.revoked_at) return { ok: false, code: "credential_unknown" };

  const stored = await consumeWebAuthnChallengeAtomic(input.challengeId);
  if (!stored || stored.purpose !== "authenticate") return { ok: false, code: "challenge_not_found" };
  if (stored.origin !== input.origin || stored.rp_id !== input.rpId) {
    return { ok: false, code: "origin_or_rp_mismatch" };
  }

  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: stored.challenge,
    expectedOrigin: input.origin,
    expectedRPID: input.rpId,
    credential: {
      id: input.response.id,
      publicKey: isoBase64URL.toBuffer(passkey.public_key_cose),
      counter: passkey.sign_count,
      transports: [] as AuthenticatorTransportFuture[],
    },
  });

  if (!verification.verified) return { ok: false, code: "verification_failed" };

  await updatePasskeySignCount(input.response.id, verification.authenticationInfo.newCounter);

  return { ok: true, accountId: passkey.account_id, verified: true };
}
