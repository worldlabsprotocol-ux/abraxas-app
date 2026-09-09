package worldlabs.abraxas.passport.receipts

/**
 * Fail-closed proof validation — mirrors lib/solanaMobile/mobileProofValidator.ts
 * and examples/good-trouble-wix/backend/browseReceiptValidator.js.
 */
object ProofValidator {
    const val BROWSE_ARTIFACT = "browse_access_receipt"
    const val PURCHASE_ARTIFACT = "eligibility_decision_receipt"
    const val PARTNER_ID = "good-trouble-cannabis"
    const val BROWSE_POLICY = "good-trouble-browse-v1"
    const val PURCHASE_POLICY = "good-trouble-retail-v1"

    private val forbiddenKeys = setOf(
        "date_of_birth", "dob", "legal_name", "address",
        "document_number", "passport_image", "selfie", "oauth_sub",
    )

    data class Result(val ok: Boolean, val code: String = "ok")

    fun validateBrowse(proof: Map<String, Any?>, nowMs: Long = System.currentTimeMillis()): Result {
        if (proof.keys.any { forbiddenKeys.contains(it.lowercase()) }) return Result(false, "forbidden_pii")
        if (proof["artifact_type"] != BROWSE_ARTIFACT) return Result(false, "artifact_type_mismatch")
        if (proof["valid_for_purchase"] != false) return Result(false, "not_browse_receipt")
        if (proof["purpose"] != "browse") return Result(false, "purpose_mismatch")
        if (proof["assurance_level"] != "L0") return Result(false, "assurance_not_l0")
        if (proof["age_band"] != "over_21") return Result(false, "age_band_mismatch")
        if (proof["partner_id"] != PARTNER_ID) return Result(false, "partner_mismatch")
        if (proof["policy_id"] != BROWSE_POLICY) return Result(false, "policy_mismatch")
        if (isExpired(proof["expires_at"], nowMs)) return Result(false, "receipt_expired")
        return Result(true)
    }

    fun validatePurchase(proof: Map<String, Any?>, nowMs: Long = System.currentTimeMillis()): Result {
        if (proof.keys.any { forbiddenKeys.contains(it.lowercase()) }) return Result(false, "forbidden_pii")
        if (proof["artifact_type"] != PURCHASE_ARTIFACT) return Result(false, "artifact_type_mismatch")
        if (proof["valid_for_purchase"] != true) return Result(false, "not_valid_for_purchase")
        if (proof["purpose"] != "purchase") return Result(false, "purpose_mismatch")
        val assurance = proof["assurance_level"] as? String
        if (assurance !in setOf("L2", "L3", "L4")) return Result(false, "insufficient_assurance")
        if (proof["partner_id"] != PARTNER_ID) return Result(false, "partner_mismatch")
        if (proof["policy_id"] != PURCHASE_POLICY) return Result(false, "policy_mismatch")
        if (proof["over_21"] != true) return Result(false, "not_over_21")
        if (isExpired(proof["expires_at"], nowMs)) return Result(false, "receipt_expired")
        return Result(true)
    }

    fun authorizeRegulatedPurchase(
        proof: Map<String, Any?>?,
        walletVerified: Boolean,
        flowConsumed: Boolean,
        replaySeen: Boolean,
        urlStatus: String? = null,
        sessionBrowseFlag: String? = null,
    ): Result {
        if (urlStatus == "approved") return Result(false, "url_status_not_authoritative")
        if (!sessionBrowseFlag.isNullOrBlank()) return Result(false, "browse_session_flag_not_checkout")
        if (replaySeen) return Result(false, "replay_detected")
        if (!walletVerified) return Result(false, "wallet_not_verified")
        if (!flowConsumed) return Result(false, "flow_not_consumed")
        if (proof == null) return Result(false, "proof_missing")
        if (validateBrowse(proof).ok) return Result(false, "browse_receipt_not_valid_for_purchase")
        val purchase = validatePurchase(proof)
        if (!purchase.ok) return purchase
        return Result(true)
    }

    private fun isExpired(expiresAt: Any?, nowMs: Long): Boolean {
        val raw = expiresAt?.toString() ?: return true
        val ts = runCatching { java.time.Instant.parse(raw).toEpochMilli() }.getOrDefault(0L)
        return ts <= nowMs
    }
}
