package worldlabs.abraxas.passport.consent

import org.json.JSONObject
import worldlabs.abraxas.passport.model.ConsentHistoryEntry
import worldlabs.abraxas.passport.model.ConsentPreview
import worldlabs.abraxas.passport.model.IssuedProof
import worldlabs.abraxas.passport.receipts.ProofValidator
import worldlabs.abraxas.passport.sandbox.DemoSeed
import java.time.Instant
import java.util.Base64
import java.util.UUID

class ConsentEngine {
    private val consumedReceiptIds = mutableSetOf<String>()

    fun buildPurchaseConsentPreview(): ConsentPreview = ConsentPreview(
        partnerId = ProofValidator.PARTNER_ID,
        partnerName = "Good Trouble (demo)",
        policyId = ProofValidator.PURCHASE_POLICY,
        purpose = "purchase",
        requestedClaim = "over_21",
        willShare = listOf("Eligible: over 21", "Assurance level: L2", "Purpose: purchase"),
        willNotShare = DemoSeed.neverSharedWithPartners,
    )

    fun issuePurchaseProof(walletVerified: Boolean): IssuedProof {
        if (!walletVerified) error("wallet_not_verified")
        val now = Instant.now()
        val expires = now.plusSeconds(3600)
        val receiptId = "dr_mobile_${UUID.randomUUID()}"
        if (consumedReceiptIds.contains(receiptId)) error("replay_detected")

        val payload = linkedMapOf<String, Any?>(
            "artifact_type" to ProofValidator.PURCHASE_ARTIFACT,
            "purpose" to "purchase",
            "valid_for_purchase" to true,
            "assurance_level" to "L2",
            "partner_id" to ProofValidator.PARTNER_ID,
            "policy_id" to ProofValidator.PURCHASE_POLICY,
            "decision_result" to "approved",
            "over_21" to true,
            "receipt_id" to receiptId,
            "issued_at" to now.toString(),
            "expires_at" to expires.toString(),
        )

        val validation = ProofValidator.validatePurchase(payload)
        if (!validation.ok) error(validation.code)

        val json = JSONObject(payload).toString()
        val signature = SandboxSigner.sign(json)
        consumedReceiptIds.add(receiptId)

        return IssuedProof(
            receiptId = receiptId,
            artifactType = ProofValidator.PURCHASE_ARTIFACT,
            purpose = "purchase",
            assuranceLevel = "L2",
            partnerId = ProofValidator.PARTNER_ID,
            policyId = ProofValidator.PURCHASE_POLICY,
            issuedAt = now.toString(),
            expiresAt = expires.toString(),
            payloadJson = json,
            signatureBase64 = signature,
        )
    }

    fun issueBrowseProof(): Map<String, Any?> {
        val now = Instant.now()
        val expires = now.plusSeconds(1800)
        return linkedMapOf(
            "artifact_type" to ProofValidator.BROWSE_ARTIFACT,
            "purpose" to "browse",
            "valid_for_purchase" to false,
            "assurance_level" to "L0",
            "age_band" to "over_21",
            "partner_id" to ProofValidator.PARTNER_ID,
            "policy_id" to ProofValidator.BROWSE_POLICY,
            "receipt_id" to "br_mobile_${UUID.randomUUID()}",
            "issued_at" to now.toString(),
            "expires_at" to expires.toString(),
        )
    }

    fun tryAuthorizePurchaseWithBrowseProof(walletVerified: Boolean): String {
        val browse = issueBrowseProof()
        val auth = ProofValidator.authorizeRegulatedPurchase(
            proof = browse,
            walletVerified = walletVerified,
            flowConsumed = true,
            replaySeen = false,
        )
        return if (auth.ok) "authorized" else auth.code
    }

    fun historyEntry(proof: IssuedProof): ConsentHistoryEntry = ConsentHistoryEntry(
        id = proof.receiptId,
        partnerName = "Good Trouble (demo)",
        decision = "approved",
        sharedSummary = "over_21 · L2 · purchase",
        timestamp = proof.issuedAt,
    )
}

/** Demo-only signer — NOT production Abraxas signing key. */
object SandboxSigner {
    fun sign(payloadJson: String): String =
        Base64.getEncoder().encodeToString("sandbox:${payloadJson.hashCode()}".toByteArray())
}
