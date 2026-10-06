// FILE: lib/demo/referenceContentPublisher/referenceContentPublisher.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import { buildPartnerFlowEntryUrl } from "@/lib/partner/partnerFlowIntegratorKit";
import {
  CONTENT_ORIGIN_DISCLOSURE_PACK_ID,
  CONTENT_ORIGIN_DISCLOSURE_POLICY_MARK,
  SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
} from "@/lib/provenance/constants";
import { listStudioPackSummaries } from "@/lib/partner/integrationStudio/catalog";
import { matchPolicyFit } from "@/lib/partner/integrationStudio/policyFit/match";
import { fingerprintArticleDraft, canonicalizeArticleDraft } from "./articleFingerprint";
import {
  buildReferencePublisherVerifyUrl,
  referencePublisherCallbackUrl,
  resolveReferencePublisherConfig,
} from "./config";
import {
  resetReferencePublisherStoreForTests,
  saveReferencePublisherDraft,
} from "./sessionStore";
import { normalizeExpectedContentHash } from "@/lib/provenance/expectedContentHash";
import { evaluateContentOriginDisclosure } from "@/lib/provenance/contentOriginDisclosure";
import {
  creatorAttestedClaim,
  aiAssistanceDisclosedClaim,
  sourceIntegrityVerifiedClaim,
} from "@/lib/provenance/claims";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";

const POLICY_ID = `${SANDBOX_CONTENT_PUBLISHER_PARTNER_ID}-${CONTENT_ORIGIN_DISCLOSURE_POLICY_MARK}`;
const SUBJECT = "0x1234567890123456789012345678901234567890";

describe("reference content publisher activation", () => {
  beforeEach(() => {
    resetReferencePublisherStoreForTests();
  });

  it("discovers content provenance in Integration Studio pack list", () => {
    const packs = listStudioPackSummaries();
    expect(packs.some((pack) => pack.pack_id === CONTENT_ORIGIN_DISCLOSURE_PACK_ID)).toBe(true);
  });

  it("maps policy-fit content provenance publish to canonical pack", () => {
    const fit = matchPolicyFit({
      action: "content_provenance_publish",
      category: "content_provenance",
      environment: "sandbox",
      capabilities: [],
    });
    expect(fit.fit).toBe(true);
    expect(fit.recommended?.pack_id).toBe(CONTENT_ORIGIN_DISCLOSURE_PACK_ID);
    expect(fit.recommended?.sandbox_only).toBe(true);
  });

  it("fingerprints article drafts deterministically without storing raw bytes server-side", () => {
    const a = fingerprintArticleDraft({ title: "Hello", body: "World" });
    const b = fingerprintArticleDraft({ title: "Hello", body: "World" });
    expect(a.content_hash).toBe(b.content_hash);
    expect(canonicalizeArticleDraft({ title: " Hello ", body: " World " })).toBe("Hello\n\nWorld");
  });

  it("binds expected content hash into hosted partner flow entry URL", () => {
    const hash = fingerprintArticleDraft({ title: "T", body: "B" }).content_hash;
    const url = buildReferencePublisherVerifyUrl({
      origin: "http://localhost:3000",
      publishAttemptId: "pub_test",
      expectedContentHash: hash,
    });
    expect(url).toContain("expected_content_hash=");
    expect(url).toContain(hash);
    expect(url).toContain(encodeURIComponent(referencePublisherCallbackUrl("http://localhost:3000")));
  });

  it("rejects artifact B when publisher bound artifact A", () => {
    const hashA = fingerprintArticleDraft({ title: "A", body: "one" }).content_hash;
    const hashB = fingerprintArticleDraft({ title: "B", body: "two" }).content_hash;
    const claims = [
      { ...creatorAttestedClaim({ subjectId: SUBJECT, artifactId: "art", contentHash: hashB }), status: "active" as const, id: "1" },
      { ...aiAssistanceDisclosedClaim({ subjectId: SUBJECT, artifactId: "art", contentHash: hashB, category: "none_declared" }), status: "active" as const, id: "2" },
      { ...sourceIntegrityVerifiedClaim({ subjectId: SUBJECT, artifactId: "art", contentHash: hashB }), status: "active" as const, id: "3" },
    ];
    const result = evaluateContentOriginDisclosure({
      claims,
      submittedContentHash: hashB,
      expectedContentHash: hashA,
    });
    expect(result.decision).toBe("denied");
  });

  it("preserves sandbox-only enforcement for content provenance pack", () => {
    expect(POLICY_PACKS.content_origin_disclosure.production_suitability).toBe("sandbox_only");
    expect(resolveReferencePublisherConfig("http://localhost:3000").pack_id).toBe(CONTENT_ORIGIN_DISCLOSURE_PACK_ID);
  });

  it("stores publish attempts without raw article persistence beyond demo session map", () => {
    saveReferencePublisherDraft({
      publish_attempt_id: "pub_1",
      title: "Title",
      body: "Body",
      content_hash: "abc",
      byte_length: 4,
      created_at: new Date().toISOString(),
      state: "awaiting_proof",
    });
    const url = buildPartnerFlowEntryUrl({
      partnerId: SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
      policyId: POLICY_ID,
      returnUrl: referencePublisherCallbackUrl("http://localhost:3000"),
      expectedContentHash: "a".repeat(64),
    });
    expect(url).toContain("expected_content_hash");
  });
});
